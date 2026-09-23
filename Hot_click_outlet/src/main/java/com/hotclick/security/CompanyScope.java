package com.hotclick.security;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Punto central de control de aislamiento por empresa (tenant).
 *
 * Uso típico en un controller:
 *   Long empresaId = companyScope.getCurrentEmpresaId();   // null si ADMIN
 *   companyScope.assertCanAccess(recurso.getEmpresa().getId());  // 403 si no es su empresa
 */
@Component
public class CompanyScope {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Retorna el empresa_id del usuario autenticado.
     * Lee primero del JWT (claim empresaId) para soportar multi-negocio.
     * Retorna null si es ADMIN o staff de plataforma (sin tenant), salvo
     * sesión de soporte ({@code impersonando}), donde usa el tenant del JWT.
     */
    public Long getCurrentEmpresaId() {
        Usuario user = getCurrentUser();
        if (user == null) {
            // API key auth: el principal es String (email empresa), no UserDetails.
            // TenantFilter ya cargó el empresaId correcto en TenantContext.
            return TenantContext.get();
        }
        if (isImpersonating()) {
            return extractEmpresaIdFromJwt();
        }
        if (isAdminIT(user) || isPlatformStaff(user)) return null;
        Long fromJwt = extractEmpresaIdFromJwt();
        return fromJwt != null ? fromJwt : user.getEmpresaId();
    }

    private Long extractEmpresaIdFromJwt() {
        String jwt = extractRawJwt();
        if (jwt == null) return null;
        try {
            return jwtUtil.extractEmpresaId(jwt);
        } catch (Exception e) {
            return null;
        }
    }

    private String extractRawJwt() {
        try {
            ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            String auth = attrs.getRequest().getHeader("Authorization");
            if (auth == null || !auth.startsWith("Bearer ")) return null;
            return auth.substring(7);
        } catch (Exception e) {
            return null;
        }
    }

    /** True si el JWT actual es una sesión de soporte (ver como negocio). */
    public boolean isImpersonating() {
        String jwt = extractRawJwt();
        return jwt != null && jwtUtil.isImpersonationToken(jwt);
    }

    /**
     * Verifica que el usuario autenticado puede acceder al recurso de la empresa indicada.
     * Solo ADMIN pasa siempre (bypass), salvo en impersonación: ahí solo esa empresa.
     * Staff SUPPORT/FINANCE/TRUST no tiene bypass.
     */
    public void assertCanAccess(Long resourceEmpresaId) {
        if (isImpersonating()) {
            Long scopeId = getCurrentEmpresaId();
            if (scopeId == null || !scopeId.equals(resourceEmpresaId)) {
                throw new TenantAccessDeniedException(
                    "Acceso denegado: el recurso pertenece a otra empresa"
                );
            }
            return;
        }
        if (isAdminIT()) return;
        Long scopeId = getCurrentEmpresaId();
        if (scopeId == null || !scopeId.equals(resourceEmpresaId)) {
            throw new TenantAccessDeniedException(
                "Acceso denegado: el recurso pertenece a otra empresa"
            );
        }
    }

    /**
     * Like assertCanAccess but handles nullable resourceEmpresaId.
     * Resources with no empresa (null) are only accessible to ADMIN;
     * any other role is denied to prevent orphaned-resource access.
     */
    public void assertCanAccessNullable(Long resourceEmpresaId) {
        if (resourceEmpresaId == null) {
            if (!isAdminIT() || isImpersonating()) {
                throw new TenantAccessDeniedException("Acceso denegado: recurso sin empresa asignada");
            }
            return;
        }
        assertCanAccess(resourceEmpresaId);
    }

    public boolean isAdminIT() {
        if (isImpersonating()) return false;
        Usuario user = getCurrentUser();
        return user != null && isAdminIT(user);
    }

    public boolean isEmprendedor() {
        if (hasAuthority("ROLE_EMPRENDEDOR")) return true;
        Usuario user = getCurrentUser();
        if (user == null) return false;
        return user.getRoles().stream()
            .anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol()));
    }

    public boolean hasRole(String rolNombre) {
        if (hasAuthority("ROLE_" + rolNombre)) return true;
        Usuario user = getCurrentUser();
        if (user == null) return false;
        return user.getRoles().stream()
            .anyMatch(r -> rolNombre.equals(r.getNombreRol()));
    }

    /** True si el SecurityContext tiene la authority (ROLE_* o permiso granular). */
    public boolean hasAuthority(String authority) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        for (GrantedAuthority a : auth.getAuthorities()) {
            if (authority.equals(a.getAuthority())) return true;
        }
        return false;
    }

    public Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof Usuario u) return u;
        if (principal instanceof UserDetails ud) {
            return usuarioRepository.findByCorreo(ud.getUsername()).orElse(null);
        }
        return null;
    }

    public Long getCurrentUserId() {
        Usuario user = getCurrentUser();
        return user != null ? user.getId() : null;
    }

    /**
     * Empresa para crear recursos de tenant.
     * ADMIN y staff de plataforma → siempre null: no crean en un negocio ajeno.
     * Impersonación → tenant del JWT.
     */
    public Long getCurrentEmpresaIdOrOwn() {
        if (isImpersonating()) {
            return getCurrentEmpresaId();
        }
        if (isAdminIT() || isPlatformStaff()) return null;
        Long id = getCurrentEmpresaId();
        if (id != null) return id;
        Usuario user = getCurrentUser();
        return user != null ? user.getEmpresaId() : null;
    }

    private boolean isAdminIT(Usuario user) {
        return user.getRoles().stream()
            .anyMatch(r -> "ADMIN".equals(r.getNombreRol()));
    }

    public boolean isPlatformStaff() {
        if (isImpersonating()) return false;
        Usuario user = getCurrentUser();
        return user != null && isPlatformStaff(user);
    }

    private boolean isPlatformStaff(Usuario user) {
        return user.getRoles().stream()
            .anyMatch(r -> PlatformStaff.esStaff(r.getNombreRol()));
    }
}
