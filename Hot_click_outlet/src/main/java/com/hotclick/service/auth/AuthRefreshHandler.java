package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.SecurityAuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AuthRefreshHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthRefreshHandler.class);

    @Autowired private JwtUtil                     jwtUtil;
    @Autowired private RefreshTokenService         refreshTokenService;
    @Autowired private PermisoRepository           permisoRepository;
    @Autowired private SecurityAuditService        securityAuditService;

    public ResponseEntity<?> refresh(Map<String, String> body) {
        String tokenStr = body.get("refreshToken");
        if (tokenStr == null || tokenStr.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Refresh token requerido"));
        }
        try {
            RefreshToken rt = refreshTokenService.validar(tokenStr);
            Usuario usuario = rt.getUsuario();
            String rol = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
            String empresaSlug = usuario.getEmpresa() != null ? usuario.getEmpresa().getSlug() : null;
            List<String> permisos = permisoRepository.findPermisosByUsuarioId(usuario.getId());
            String newAccessToken = jwtUtil.generateTokenFull(
                usuario.getCorreo(), usuario.getId(), rol,
                usuario.getEmpresaId(), empresaSlug, permisos
            );
            return ResponseEntity.ok(Map.of(
                "accessToken", newAccessToken,
                "tipo",        "Bearer"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        }
    }

    public ResponseEntity<ResponseDTO> logout(Map<String, String> body, HttpServletRequest httpRequest) {
        String tokenStr = body.get("refreshToken");
        if (tokenStr != null && !tokenStr.isBlank()) {
            refreshTokenService.revocar(tokenStr);
        }
        try { securityAuditService.logLogout(null, null, httpRequest); } catch (Exception e) { log.warn("audit error: {}", e.getMessage()); }
        return ResponseEntity.ok(ResponseDTO.success("Sesión cerrada correctamente", null));
    }
}
