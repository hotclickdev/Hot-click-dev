package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.service.PasswordResetService;
import com.hotclick.service.SecurityAuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Recuperar contraseña por código de 6 dígitos: forgot-password → verify-code → reset-password.
 *
 * Anti-enumeración: forgot-password responde siempre lo mismo y verify-code / reset-password
 * usan un único mensaje de error, exista o no la cuenta.
 */
@Service
public class AuthPasswordRecoveryHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthPasswordRecoveryHandler.class);

    static final String MSG_CODIGO_ENVIADO    = "Si el correo está registrado, recibirás un código de verificación";
    static final String MSG_CODIGO_INVALIDO   = "Código incorrecto o vencido. Revisalo o pedí uno nuevo.";
    static final String MSG_CONTRASENA        = "La contraseña debe tener entre 8 y 128 caracteres y no puede ser igual a tu correo";
    static final String MSG_SESION_INVALIDA   = "La recuperación venció o el código no es válido. Pedí un código nuevo.";
    private static final Pattern CODIGO_6_DIGITOS = Pattern.compile("^\\d{6}$");

    @Autowired private PasswordResetService        passwordResetService;
    @Autowired private SecurityAuditService        securityAuditService;

    public ResponseEntity<ResponseDTO> forgotPassword(Map<String, String> body, HttpServletRequest request) {
        String correo = body.get("correo");
        if (correo == null || correo.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El correo es requerido"));
        }
        try {
            passwordResetService.enviarCodigo(correo.trim());
        } catch (RuntimeException e) {
            // Límite de reenvíos, fallo de envío, etc.: se registra pero la respuesta no cambia,
            // porque solo pasa con cuentas existentes y eso revelaría que el correo está registrado.
            log.warn("[forgot-password] {}: {}", e.getClass().getSimpleName(), e.getMessage());
        }
        AuthAuditSupport.run(log, () -> securityAuditService.logPasswordResetRequest(correo.trim(), request));
        return ResponseEntity.ok(ResponseDTO.success(MSG_CODIGO_ENVIADO, null));
    }

    public ResponseEntity<ResponseDTO> verifyCode(Map<String, String> body) {
        String correo = body.get("correo");
        String codigo = body.get("codigo");
        if (correo == null || correo.isBlank() || codigo == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Correo y código son requeridos"));
        }
        if (!CODIGO_6_DIGITOS.matcher(codigo.trim()).matches()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(MSG_CODIGO_INVALIDO));
        }
        try {
            passwordResetService.verificarCodigo(correo.trim(), codigo.trim());
            return ResponseEntity.ok(ResponseDTO.success("Código verificado correctamente", null));
        } catch (RuntimeException e) {
            log.info("[verify-code] rechazado: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ResponseDTO.error(MSG_CODIGO_INVALIDO));
        }
    }

    public ResponseEntity<ResponseDTO> resetPassword(Map<String, String> body, HttpServletRequest request) {
        String correo          = body.get("correo");
        String codigo          = body.get("codigo");
        String nuevaContrasena = body.get("nuevaContrasena");
        if (correo == null || correo.isBlank() || codigo == null || !CODIGO_6_DIGITOS.matcher(codigo.trim()).matches()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(MSG_SESION_INVALIDA));
        }
        if (!AuthSupport.esContrasenaRecuperacionValida(nuevaContrasena, correo)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(MSG_CONTRASENA));
        }
        Optional<Usuario> cambiado = passwordResetService.cambiarContrasena(correo.trim(), codigo.trim(), nuevaContrasena);
        if (cambiado.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(MSG_SESION_INVALIDA));
        }
        Usuario usuario = cambiado.get();
        AuthAuditSupport.run(log, () -> securityAuditService.logPasswordResetSuccess(usuario.getId(), usuario.getCorreo(), request));
        return ResponseEntity.ok(ResponseDTO.success("Contraseña actualizada correctamente", null));
    }
}
