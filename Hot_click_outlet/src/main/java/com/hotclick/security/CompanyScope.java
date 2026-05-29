package com.hotclick.security;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/**
 * Punto central de control de aislamiento por empresa (tenant).
 *
 * Uso típico en un controller:
 *   Long empresaId = companyScope.getCurrentEmpresaId();   // null si ADMIN_IT
 *   companyScope.assertCanAccess(recurso.getEmpresa().getId());  // 403 si no es su empresa
 */
@Component
public class CompanyScope {

    @Autowired
    private UsuarioRepository usuarioRepository;

    /**
     * Retorna el empresa_id del usuario autenticado.
     * Retorna null si es ADMIN_IT (puede ver todo).
     */
    public Long getCurrentEmpresaId() {
        Usuario user = getCurrentUser();
        if (user == null) return null;
        if (isAdminIT(user)) return null;
        return user.getEmpresaId();
    }

    /**
     * Verifica que el usuario autenticado puede acceder al recurso de la empresa indicada.
     * ADMIN_IT pasa siempre. Cualquier otro rol lanza 403 si la empresa no coincide.
     */
    public void assertCanAccess(Long resourceEmpresaId) {
        if (isAdminIT()) return;
        Long scopeId = getCurrentEmpresaId();
        if (scopeId == null || !scopeId.equals(resourceEmpresaId)) {
            throw new TenantAccessDeniedException(
                "Acceso denegado: el recurso pertenece a otra empresa"
            );
        }
    }

    /**
     * Igual que assertCanAccess pero acepta Long nullable sin NPE.
     */
    public void assertCanAccessNullable(Long resourceEmpresaId) {
        if (resourceEmpresaId == null) return;
        assertCanAccess(resourceEmpresaId);
    }

    public boolean isAdminIT() {
        Usuario user = getCurrentUser();
        return user != null && isAdminIT(user);
    }

    public boolean isEmprendedor() {
        Usuario user = getCurrentUser();
        if (user == null) return false;
        return user.getRoles().stream()
            .anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol()));
    }

    public boolean hasRole(String rolNombre) {
        Usuario user = getCurrentUser();
        if (user == null) return false;
        return user.getRoles().stream()
            .anyMatch(r -> rolNombre.equals(r.getNombreRol()));
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

    private boolean isAdminIT(Usuario user) {
        return user.getRoles().stream()
            .anyMatch(r -> "ADMIN_IT".equals(r.getNombreRol()));
    }
}
