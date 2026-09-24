package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
    @Autowired private AuthSupport                 authSupport;
    @Autowired private SecurityAuditService        securityAuditService;
    @Autowired private UsuarioService              usuarioService;

    public ResponseEntity<?> refresh(Map<String, String> body,
                                     HttpServletRequest request,
                                     HttpServletResponse response) {
        String tokenStr = refreshTokenService.readCookie(request);
        if (tokenStr == null || tokenStr.isBlank()) {
            tokenStr = body != null ? body.get("refreshToken") : null;
        }
        if (tokenStr == null || tokenStr.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Refresh token requerido"));
        }
        try {
            RefreshToken rt = refreshTokenService.rotar(tokenStr, request);
            if (rt.getRawToken() != null) {
                refreshTokenService.writeCookie(response, rt.getRawToken());
            }
            Usuario usuario = rt.getUsuario();
            String rol = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
            String empresaSlug = usuario.getEmpresa() != null ? usuario.getEmpresa().getSlug() : null;
            List<String> permisos = authSupport.permisosDe(usuario.getId());
            String newAccessToken = jwtUtil.generateTokenFull(
                usuario.getCorreo(), usuario.getId(), rol,
                usuario.getEmpresaId(), empresaSlug, permisos
            );
            return ResponseEntity.ok(Map.of(
                "accessToken", newAccessToken,
                "tipo",        "Bearer"
            ));
        } catch (RuntimeException e) {
            refreshTokenService.clearCookie(response);
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        }
    }

    public ResponseEntity<ResponseDTO> logout(Map<String, String> body,
                                              HttpServletRequest httpRequest,
                                              HttpServletResponse response) {
        String tokenStr = body != null ? body.get("refreshToken") : null;
        if (tokenStr == null || tokenStr.isBlank()) {
            tokenStr = refreshTokenService.readCookie(httpRequest);
        }
        if (tokenStr != null && !tokenStr.isBlank()) {
            refreshTokenService.revocar(tokenStr);
        } else {
            revocarFamiliaSiAutenticado(httpRequest);
        }
        refreshTokenService.clearCookie(response);
        AuthAuditSupport.run(log, () -> securityAuditService.logLogout(null, null, httpRequest));
        return ResponseEntity.ok(ResponseDTO.success("Sesión cerrada correctamente", null));
    }

    private void revocarFamiliaSiAutenticado(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) return;
        try {
            Long userId = jwtUtil.extractUserId(auth.substring(7));
            usuarioService.buscarPorId(userId).ifPresent(refreshTokenService::revocarTodosDeUsuario);
        } catch (Exception e) {
            log.debug("Logout sin JWT usable para revocar familia: {}", e.getMessage());
        }
    }
}
