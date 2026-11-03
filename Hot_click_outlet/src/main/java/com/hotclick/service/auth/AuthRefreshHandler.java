package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TokenRevocadoService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
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
    @Autowired private TokenRevocadoService        tokenRevocadoService;
    @Autowired private AuthSupport                 authSupport;
    @Autowired private SecurityAuditService        securityAuditService;
    @Autowired private UsuarioService              usuarioService;
    @Autowired private com.hotclick.repository.MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private com.hotclick.repository.EmpresaRepository empresaRepository;

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
            Usuario usuario = rt.getUsuario();
            // Solo una cuenta activa (estado 1) renueva sesión: eliminado, suspendido, inactivo o pendiente con un
            // refresh token vivo no obtiene access token; se revoca toda su familia y se limpia la cookie.
            if (!Integer.valueOf(Constants.ESTADO_ACTIVO).equals(usuario.getEstado())) {
                refreshTokenService.revocarTodosDeUsuario(usuario);
                refreshTokenService.clearCookie(response);
                return ResponseEntity.status(401).body(ResponseDTO.error("Sesión expirada. Iniciá sesión de nuevo."));
            }
            if (rt.getRawToken() != null) {
                refreshTokenService.writeCookie(response, rt.getRawToken());
            }
            String rol = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
            Long empresaId = usuario.getEmpresaId();
            String empresaSlug = usuario.getEmpresa() != null ? usuario.getEmpresa().getSlug() : null;
            // P1-03: si el usuario eligió otro negocio, se mantiene ese negocio y el rol de su
            // membresía, siempre que siga activa. Si ya no lo está, vuelve al negocio principal.
            if (rt.getEmpresaActivaId() != null) {
                MiembroEmpresa m = miembroEmpresaRepository
                    .findByUsuarioIdAndEmpresaIdAndEstado(usuario.getId(), rt.getEmpresaActivaId(), 1).orElse(null);
                com.hotclick.model.Empresa activa = m == null ? null
                    : empresaRepository.findById(rt.getEmpresaActivaId()).orElse(null);
                if (activa != null) {
                    rol = RolMembresia.paraJwt(m, usuario);
                    empresaId = activa.getId();
                    empresaSlug = activa.getSlug();
                }
            }
            List<String> permisos = authSupport.permisosDe(usuario.getId());
            String newAccessToken = jwtUtil.generateTokenFull(
                usuario.getCorreo(), usuario.getId(), rol,
                empresaId, empresaSlug, permisos
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
        revocarAccessToken(httpRequest);
        refreshTokenService.clearCookie(response);
        AuthAuditSupport.run(log, () -> securityAuditService.logLogout(null, null, httpRequest));
        return ResponseEntity.ok(ResponseDTO.success("Sesión cerrada correctamente", null));
    }

    /** Al cerrar sesión el access token (normal o de soporte) queda en la denylist hasta su exp. */
    private void revocarAccessToken(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) return;
        try {
            tokenRevocadoService.revocar(auth.substring(7), TokenRevocadoService.MOTIVO_LOGOUT);
        } catch (Exception e) {
            log.debug("Logout: no se pudo revocar el access token: {}", e.getMessage());
        }
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
