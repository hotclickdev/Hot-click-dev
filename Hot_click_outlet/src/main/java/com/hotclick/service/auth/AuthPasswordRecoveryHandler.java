package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.PasswordResetService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthPasswordRecoveryHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthPasswordRecoveryHandler.class);

    @Autowired private PasswordResetService        passwordResetService;
    @Autowired private AuthSupport                 authSupport;

    public ResponseEntity<ResponseDTO> forgotPassword(Map<String, String> body) {
        String correo = body.get("correo");
        if (correo == null || correo.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El correo es requerido"));
        }
        try {
            passwordResetService.enviarCodigo(correo.trim());
            return ResponseEntity.ok(ResponseDTO.success("Si el correo está registrado, recibirás un código de verificación", null));
        } catch (RuntimeException e) {
            String msg = e.getMessage();
            log.error("[forgot-password] {}: {}", e.getClass().getSimpleName(), msg);
            return ResponseEntity.badRequest().body(ResponseDTO.error(
                msg != null && !msg.isBlank() ? msg : "Error al enviar el correo"));
        }
    }

    public ResponseEntity<ResponseDTO> verifyCode(Map<String, String> body) {
        String correo = body.get("correo");
        String codigo = body.get("codigo");
        if (correo == null || codigo == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Correo y código son requeridos"));
        }
        try {
            passwordResetService.verificarCodigo(correo.trim(), codigo.trim());
            return ResponseEntity.ok(ResponseDTO.success("Código verificado correctamente", null));
        } catch (Exception e) {
            String msg = e.getMessage();
            return ResponseEntity.status(400).body(ResponseDTO.error(
                msg != null && !msg.isBlank() ? msg : "Código inválido o expirado"));
        }
    }

    public ResponseEntity<ResponseDTO> resetPassword(Map<String, String> body) {
        String correo          = body.get("correo");
        String nuevaContrasena = body.get("nuevaContrasena");
        if (correo == null || !authSupport.esContrasenaValida(nuevaContrasena)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("La contraseña debe tener al menos 8 caracteres, una mayúscula y un número"));
        }
        boolean ok = passwordResetService.cambiarContrasena(correo.trim(), nuevaContrasena);
        if (ok) return ResponseEntity.ok(ResponseDTO.success("Contraseña actualizada correctamente", null));
        return ResponseEntity.status(400).body(ResponseDTO.error("Sesión de recuperación inválida o expirada"));
    }
}
