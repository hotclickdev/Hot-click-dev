package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.security.PlatformStaff;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;

@Service
public class AuthSupport {

    private static final Logger log = LoggerFactory.getLogger(AuthSupport.class);

    @Autowired private UsuarioService      usuarioService;
    @Autowired private JwtUtil             jwtUtil;
    @Autowired private RefreshTokenService refreshTokenService;
    @Autowired private PermisoRepository   permisoRepository;

    public AuthResponse buildAuthResponse(Usuario usuario) {
        List<String> nombresRol = usuario.getRoles().stream()
            .map(r -> r.getNombreRol())
            .toList();
        String rol = PlatformStaff.rolPrincipal(nombresRol);
        // Staff de plataforma (ADMIN + SUPPORT/FINANCE/TRUST): sin tenant en JWT.
        boolean sinTenant = PlatformStaff.esSinTenant(rol);
        Long empresaId = sinTenant ? null : usuario.getEmpresaId();
        String empresaSlug = (!sinTenant && usuario.getEmpresa() != null)
            ? usuario.getEmpresa().getSlug() : null;
        String empresaNombre = (!sinTenant && usuario.getEmpresa() != null)
            ? usuario.getEmpresa().getNombreEmpresa() : null;
        List<String> permisos = permisosDe(usuario.getId());
        String accessToken  = jwtUtil.generateTokenFull(
            usuario.getCorreo(), usuario.getId(), rol,
            empresaId, empresaSlug, permisos
        );
        RefreshToken rt     = refreshTokenService.crear(usuario);
        String nombre       = usuario.getNombre() != null ? usuario.getNombre() : usuario.getCorreo().split("@")[0];
        AuthResponse resp   = new AuthResponse(accessToken, rt.getToken(), usuario.getId(), usuario.getCorreo(), rol, nombre);
        resp.setEmpresaId(empresaId);
        resp.setEmpresaSlug(empresaSlug);
        resp.setEmpresaNombre(empresaNombre);
        resp.setPermisos(permisos);
        return resp;
    }

    /**
     * Permisos del rol. Si falta la tabla nativa (H2 sin Flyway), el login
     * sigue con el JWT de rol; no se bloquea la sesión.
     */
    public List<String> permisosDe(Long userId) {
        try {
            return permisoRepository.findPermisosByUsuarioId(userId);
        } catch (DataAccessException ex) {
            log.warn("No se pudieron leer permisos userId={}: {}", userId, ex.getMessage());
            return List.of();
        }
    }

    public Usuario usuarioFromRequest(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new SecurityException("Token de autenticación requerido");
        }
        Long userId = jwtUtil.extractUserId(auth.substring(7));
        return usuarioService.buscarPorId(userId)
                .orElseThrow(() -> new SecurityException("Usuario no encontrado"));
    }

    /** Minimum 8 chars, at least one uppercase letter and one digit. */
    public boolean esContrasenaValida(String pwd) {
        if (pwd == null || pwd.length() < 8) return false;
        boolean hasUpper = false, hasDigit = false;
        for (char c : pwd.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            if (Character.isDigit(c))     hasDigit = true;
        }
        return hasUpper && hasDigit;
    }

    public String slugify(String text) {
        String normalized = Normalizer.normalize(text.toLowerCase().trim(), Normalizer.Form.NFD);
        return normalized.replaceAll("[^\\p{ASCII}]", "")
                         .replaceAll("[^a-z0-9\\s-]", "")
                         .replaceAll("\\s+", "-")
                         .replaceAll("-{2,}", "-")
                         .replaceAll("(^-)|(-$)", "");
    }
}
