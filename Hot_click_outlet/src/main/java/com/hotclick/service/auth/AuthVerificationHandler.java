package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.service.EmailVerificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthVerificationHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthVerificationHandler.class);

    @Autowired private PasswordEncoder             passwordEncoder;
    @Autowired private EmailVerificationService    emailVerificationService;
    @Autowired private AuthSupport                 authSupport;

    public ResponseEntity<ResponseDTO> sendVerification(Usuario usuario) {
        try {
            usuario.setContrasenaHash(passwordEncoder.encode(usuario.getContrasenaHash()));
            emailVerificationService.iniciarRegistro(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Código de verificación enviado a tu correo", null));
        } catch (Exception e) {
            String msg = e.getMessage();
            if (msg == null || msg.isBlank()) {
                msg = "Error al enviar el código. Revisá que el correo sea válido e intentá de nuevo.";
            }
            log.error("[send-verification] {}: {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return ResponseEntity.badRequest().body(ResponseDTO.error(msg));
        }
    }

    public ResponseEntity<ResponseDTO> verifyRegistration(Map<String, String> body) {
        String correo = body.get("correo");
        String codigo = body.get("codigo");
        if (correo == null || codigo == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Correo y código son requeridos"));
        }
        try {
            Usuario nuevo = emailVerificationService.verificarYRegistrar(correo.trim(), codigo.trim());
            return ResponseEntity.ok(ResponseDTO.success("Cuenta creada exitosamente", authSupport.buildAuthResponse(nuevo)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
