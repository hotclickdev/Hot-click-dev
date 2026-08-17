package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.CodigoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.OtpService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthEmailOtpHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthEmailOtpHandler.class);

    @Autowired private UsuarioService              usuarioService;
    @Autowired private JwtUtil                     jwtUtil;
    @Autowired private PasswordEncoder             passwordEncoder;
    @Autowired private OtpService                  otpService;
    @Autowired private AuthSupport                 authSupport;

    public ResponseEntity<ResponseDTO> sendLoginEmailOtp(Map<String, String> body) {
        String tempToken = body.get("tempToken");
        if (tempToken == null || tempToken.isBlank())
            return ResponseEntity.badRequest().body(ResponseDTO.error("tempToken requerido"));
        try {
            if (!jwtUtil.isTempToken(tempToken))
                return ResponseEntity.status(401).body(ResponseDTO.error("Token inválido o expirado"));
            Long userId = jwtUtil.extractUserId(tempToken);
            Usuario usuario = usuarioService.buscarPorId(userId)
                .orElseThrow(() -> new SecurityException("Usuario no encontrado"));
            if (!usuario.hasEmailOtpEnabled())
                return ResponseEntity.status(400).body(ResponseDTO.error("EMAIL_OTP no habilitado para esta cuenta"));
            otpService.enviarOtp2Fa(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Código enviado a " + usuario.getCorreo(), null));
        } catch (RuntimeException e) {
            log.warn("[2FA/email/send] {}", e.getMessage());
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    public ResponseEntity<ResponseDTO> enableEmailOtp(HttpServletRequest request) {
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            otpService.enviarOtp2Fa(usuario);
            return ResponseEntity.ok(ResponseDTO.success(
                "Código enviado a " + usuario.getCorreo() + ". Ingresalo para activar Email OTP.", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[2FA/email/enable] {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    public ResponseEntity<ResponseDTO> activateEmailOtp(Map<String, String> body, HttpServletRequest request) {
        String code = body.get("code");
        if (code == null || code.isBlank())
            return ResponseEntity.badRequest().body(ResponseDTO.error("Código requerido"));
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            CodigoOtp otp = otpService.verificarOtp(
                usuario, Constants.OTP_TIPO_2FA_LOGIN, code.trim());
            otpService.marcarUsado(otp);
            usuario.addMethod(Constants.METODO_2FA_EMAIL_OTP);
            usuarioService.guardar(usuario);
            log.info("[2FA] EMAIL_OTP activado para userId={}", usuario.getId());
            return ResponseEntity.ok(ResponseDTO.success(
                "Email OTP activado correctamente", Map.of("methods", usuario.getActiveMethods())));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al activar Email OTP"));
        }
    }

    public ResponseEntity<ResponseDTO> disableEmailOtp(Map<String, String> body, HttpServletRequest request) {
        String contrasena = body.get("contrasena");
        if (contrasena == null || contrasena.isBlank())
            return ResponseEntity.badRequest().body(ResponseDTO.error("Contraseña requerida para desactivar Email OTP"));
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            if (!passwordEncoder.matches(contrasena, usuario.getContrasenaHash()))
                return ResponseEntity.status(401).body(ResponseDTO.error("Contraseña incorrecta"));
            usuario.removeMethod(Constants.METODO_2FA_EMAIL_OTP);
            usuarioService.guardar(usuario);
            log.info("[2FA] EMAIL_OTP desactivado para userId={}", usuario.getId());
            return ResponseEntity.ok(ResponseDTO.success(
                "Email OTP desactivado", Map.of("methods", usuario.getActiveMethods())));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al desactivar Email OTP"));
        }
    }
}
