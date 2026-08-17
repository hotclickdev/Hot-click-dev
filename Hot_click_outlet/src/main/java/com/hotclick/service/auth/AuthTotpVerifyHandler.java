package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.CodigoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.OtpService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TwoFactorService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthTotpVerifyHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthTotpVerifyHandler.class);

    @Autowired private UsuarioService              usuarioService;
    @Autowired private JwtUtil                     jwtUtil;
    @Autowired private TwoFactorService            twoFactorService;
    @Autowired private PasswordEncoder             passwordEncoder;
    @Autowired private OtpService                  otpService;
    @Autowired private SecurityAuditService        securityAuditService;
    @Autowired private AuthSupport                 authSupport;

    public ResponseEntity<?> verify2FA(Map<String, String> body, HttpServletRequest httpRequest) {
        String tempToken    = body.get("tempToken");
        String code         = body.get("code");
        String recoveryCode = body.get("recoveryCode");
        // 'method' tells backend which factor to verify: TOTP (default) or EMAIL_OTP
        String method       = body.getOrDefault("method", Constants.METODO_2FA_TOTP);

        if (tempToken == null || (code == null && recoveryCode == null)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Datos incompletos"));
        }
        try {
            if (!jwtUtil.isTempToken(tempToken)) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Token inválido o expirado"));
            }

            String correo = jwtUtil.extractUsername(tempToken);
            Optional<Usuario> opt = usuarioService.buscarPorCorreo(correo);
            if (opt.isEmpty()) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
            }

            Usuario usuario = opt.get();

            if (usuario.getBloqueadoHasta() != null && LocalDateTime.now(Constants.ZONA_CR).isBefore(usuario.getBloqueadoHasta())) {
                return ResponseEntity.status(403).body(ResponseDTO.error(
                    "Cuenta temporalmente bloqueada. Intentá más tarde."));
            }

            // ── Códigos de recuperación (method-agnostic) ─────────────────────
            if (recoveryCode != null && !recoveryCode.isBlank()) {
                String normalized = twoFactorService.normalizeRecoveryCode(recoveryCode);
                List<String> stored = new ArrayList<>(twoFactorService.jsonToCodes(usuario.getRecoveryCodes()));
                int matchIdx = -1;
                for (int i = 0; i < stored.size(); i++) {
                    if (passwordEncoder.matches(normalized, stored.get(i))) { matchIdx = i; break; }
                }
                if (matchIdx < 0) {
                    usuarioService.incrementarIntentosFallidos(usuario.getId());
                    log.warn("[2FA] Código de recuperación inválido para userId={}", usuario.getId());
                    AuthAuditSupport.run(log, () -> securityAuditService.log2FAFailed(usuario.getId(), usuario.getCorreo(), httpRequest, "RECOVERY_CODE"));
                    return ResponseEntity.status(401).body(ResponseDTO.error("Código de recuperación inválido"));
                }
                stored.remove(matchIdx);
                usuario.setRecoveryCodes(twoFactorService.codesToJson(stored));
                usuarioService.guardar(usuario);
                usuarioService.resetearIntentosFallidos(usuario.getId());
                log.info("[2FA] Login por recovery code userId={}. Restantes: {}", usuario.getId(), stored.size());
                AuthAuditSupport.run(log, () -> securityAuditService.log2FASuccess(usuario.getId(), usuario.getCorreo(), httpRequest, "RECOVERY_CODE"));
                return ResponseEntity.ok(authSupport.buildAuthResponse(usuario));
            }

            // ── Verificación según método seleccionado ────────────────────────
            if (Constants.METODO_2FA_EMAIL_OTP.equals(method)) {
                // Validate that the user actually has EMAIL_OTP enabled to prevent method injection
                if (!usuario.hasEmailOtpEnabled() && Boolean.TRUE.equals(usuario.getTwoFactorEnabled())) {
                    // Backward compat: if methods field is null, don't allow EMAIL_OTP
                    return ResponseEntity.status(400).body(ResponseDTO.error("Método EMAIL_OTP no habilitado para esta cuenta"));
                }
                try {
                    CodigoOtp otp = otpService.verificarOtp(
                        usuario, Constants.OTP_TIPO_2FA_LOGIN, code);
                    otpService.marcarUsado(otp);
                    usuarioService.resetearIntentosFallidos(usuario.getId());
                    log.info("[2FA] Login por EMAIL_OTP exitoso userId={}", usuario.getId());
                    AuthAuditSupport.run(log, () -> securityAuditService.log2FASuccess(usuario.getId(), usuario.getCorreo(), httpRequest, "EMAIL_OTP"));
                    return ResponseEntity.ok(authSupport.buildAuthResponse(usuario));
                } catch (RuntimeException e) {
                    usuarioService.incrementarIntentosFallidos(usuario.getId());
                    AuthAuditSupport.run(log, () -> securityAuditService.log2FAFailed(usuario.getId(), usuario.getCorreo(), httpRequest, "EMAIL_OTP"));
                    return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
                }
            }

            // Default: TOTP with replay protection
            if (!twoFactorService.verifyCodeWithReplayProtection(usuario, code)) {
                usuarioService.incrementarIntentosFallidos(usuario.getId());
                log.warn("[2FA] TOTP incorrecto o replay para userId={}", usuario.getId());
                AuthAuditSupport.run(log, () -> securityAuditService.log2FAFailed(usuario.getId(), usuario.getCorreo(), httpRequest, "TOTP"));
                return ResponseEntity.status(401).body(ResponseDTO.error("Código incorrecto o expirado"));
            }

            usuarioService.resetearIntentosFallidos(usuario.getId());
            log.info("[2FA] TOTP login exitoso userId={}", usuario.getId());
            AuthAuditSupport.run(log, () -> securityAuditService.log2FASuccess(usuario.getId(), usuario.getCorreo(), httpRequest, "TOTP"));
            return ResponseEntity.ok(authSupport.buildAuthResponse(usuario));

        } catch (Exception e) {
            log.error("[2FA] verify error: {}", e.getMessage());
            return ResponseEntity.status(401).body(ResponseDTO.error("Token expirado o inválido"));
        }
    }
}
