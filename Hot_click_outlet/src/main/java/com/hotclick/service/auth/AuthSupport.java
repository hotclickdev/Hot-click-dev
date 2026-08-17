package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;

@Service
public class AuthSupport {

    @Autowired private UsuarioService      usuarioService;
    @Autowired private JwtUtil             jwtUtil;
    @Autowired private RefreshTokenService refreshTokenService;
    @Autowired private PermisoRepository   permisoRepository;

    public AuthResponse buildAuthResponse(Usuario usuario) {
        String rol          = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
        String empresaSlug  = usuario.getEmpresa() != null ? usuario.getEmpresa().getSlug()         : null;
        String empresaNombre= usuario.getEmpresa() != null ? usuario.getEmpresa().getNombreEmpresa() : null;
        List<String> permisos = permisoRepository.findPermisosByUsuarioId(usuario.getId());
        String accessToken  = jwtUtil.generateTokenFull(
            usuario.getCorreo(), usuario.getId(), rol,
            usuario.getEmpresaId(), empresaSlug, permisos
        );
        RefreshToken rt     = refreshTokenService.crear(usuario);
        String nombre       = usuario.getNombre() != null ? usuario.getNombre() : usuario.getCorreo().split("@")[0];
        AuthResponse resp   = new AuthResponse(accessToken, rt.getToken(), usuario.getId(), usuario.getCorreo(), rol, nombre);
        resp.setEmpresaId(usuario.getEmpresaId());
        resp.setEmpresaSlug(empresaSlug);
        resp.setEmpresaNombre(empresaNombre);
        resp.setPermisos(permisos);
        return resp;
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
