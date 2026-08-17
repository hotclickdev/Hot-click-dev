package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthPasswordChangeHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthPasswordChangeHandler.class);

    @Autowired private UsuarioService              usuarioService;
    @Autowired private PasswordEncoder             passwordEncoder;
    @Autowired private RefreshTokenService         refreshTokenService;
    @Autowired private SecurityAuditService        securityAuditService;
    @Autowired private AuthSupport                 authSupport;

    public ResponseEntity<ResponseDTO> changePassword(Map<String, String> body, HttpServletRequest request) {
        String actual = body.get("contrasenaActual");
        String nueva  = body.get("nuevaContrasena");

        if (actual == null || nueva == null || !authSupport.esContrasenaValida(nueva)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("La contraseña debe tener al menos 8 caracteres, una mayúscula y un número"));
        }
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            if (!passwordEncoder.matches(actual, usuario.getContrasenaHash())) {
                return ResponseEntity.status(401).body(ResponseDTO.error("La contraseña actual es incorrecta"));
            }
            usuario.setContrasenaHash(passwordEncoder.encode(nueva));
            usuarioService.guardar(usuario);
            // Revocar todos los refresh tokens para forzar re-login en otros dispositivos
            refreshTokenService.revocar(body.getOrDefault("refreshToken", ""));
            try { securityAuditService.logPasswordChanged(usuario.getId(), usuario.getCorreo(), request); } catch (Exception e) { log.warn("audit error: {}", e.getMessage()); }
            return ResponseEntity.ok(ResponseDTO.success("Contraseña actualizada correctamente", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al cambiar la contraseña"));
        }
    }
}
