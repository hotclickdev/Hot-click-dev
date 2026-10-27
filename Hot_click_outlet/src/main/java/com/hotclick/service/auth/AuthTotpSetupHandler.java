package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.service.TwoFactorService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AuthTotpSetupHandler {

    @Autowired private UsuarioService              usuarioService;
    @Autowired private TwoFactorService            twoFactorService;
    @Autowired private PasswordEncoder             passwordEncoder;
    @Autowired private AuthSupport                 authSupport;

    /**
     * Si el usuario ya tiene 2FA activo, reconfigurar (rotar el secreto) exige una credencial vigente:
     * la contraseña actual o un código TOTP válido del secreto actual. Sin esto, una sesión robada
     * podía reemplazar el segundo factor.
     */
    public ResponseEntity<ResponseDTO> setup2FA(Map<String, String> body, HttpServletRequest request) {
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            if (Boolean.TRUE.equals(usuario.getTwoFactorEnabled()) && !credencialVigente(usuario, body)) {
                return ResponseEntity.status(401).body(ResponseDTO.error(
                    "Con el 2FA activo necesitás tu contraseña actual o un código de tu app para reconfigurarlo"));
            }
            String plainSecret  = twoFactorService.generateSecret();
            String encSecret    = twoFactorService.encryptForStorage(plainSecret);  // AES-256-GCM
            usuario.setTwoFactorSecret(encSecret);   // store encrypted
            usuario.setTwoFactorEnabled(false);      // not active until verified
            usuarioService.guardar(usuario);
            String qrUri = twoFactorService.buildQrUri(usuario.getCorreo(), plainSecret);  // QR uses plaintext
            return ResponseEntity.ok(ResponseDTO.success(
                "Escanea el código QR con Google Authenticator y luego ingresá el código para activar",
                Map.of("secret", plainSecret, "qrUri", qrUri)  // return plaintext for manual entry
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al configurar 2FA"));
        }
    }

    private boolean credencialVigente(Usuario usuario, Map<String, String> body) {
        if (body == null) return false;
        String contrasena = body.get("contrasena");
        if (contrasena != null && !contrasena.isBlank()
                && passwordEncoder.matches(contrasena, usuario.getContrasenaHash())) {
            return true;
        }
        String code = body.get("code");
        return code != null && !code.isBlank() && usuario.getTwoFactorSecret() != null
                && twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code);
    }

    public ResponseEntity<ResponseDTO> activate2FA(Map<String, String> body, HttpServletRequest request) {
        String code = body.get("code");
        if (code == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Código requerido"));
        }
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            if (usuario.getTwoFactorSecret() == null) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Primero iniciá la configuración 2FA"));
            }
            if (!twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code)) {
                return ResponseEntity.status(400).body(ResponseDTO.error("Código incorrecto o expirado"));
            }
            // Register TOTP as an active method
            usuario.addMethod(Constants.METODO_2FA_TOTP);

            // Generate recovery codes only when activating for the first time
            if (usuario.getRecoveryCodes() == null || usuario.getRecoveryCodes().isBlank()) {
                List<String> plainCodes  = twoFactorService.generateRecoveryCodes();
                List<String> hashedCodes = plainCodes.stream()
                        .map(c -> passwordEncoder.encode(twoFactorService.normalizeRecoveryCode(c)))
                        .collect(Collectors.toList());
                usuario.setRecoveryCodes(twoFactorService.codesToJson(hashedCodes));
                usuarioService.guardar(usuario);
                return ResponseEntity.ok(ResponseDTO.success(
                    "Autenticación de dos factores (App) activada correctamente",
                    Map.of("recoveryCodes", plainCodes, "methods", usuario.getActiveMethods())
                ));
            }
            usuarioService.guardar(usuario);
            return ResponseEntity.ok(ResponseDTO.success(
                "App de autenticación añadida correctamente",
                Map.of("methods", usuario.getActiveMethods())
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al activar 2FA"));
        }
    }

    public ResponseEntity<ResponseDTO> disable2FA(Map<String, String> body, HttpServletRequest request) {
        String contrasena = body == null ? null : body.get("contrasena");
        String code       = body == null ? null : body.get("code");

        if (contrasena == null || contrasena.isBlank() || code == null || code.isBlank()) {
            return ResponseEntity.status(401).body(ResponseDTO.error("Contraseña y código son requeridos"));
        }
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            if (usuario.getTwoFactorSecret() == null) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("La app de autenticación no está activa"));
            }
            if (!passwordEncoder.matches(contrasena, usuario.getContrasenaHash())) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Contraseña incorrecta"));
            }
            if (!twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code)) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Código de autenticación incorrecto"));
            }
            // Remove TOTP from methods; leave EMAIL_OTP if it exists
            usuario.removeMethod(Constants.METODO_2FA_TOTP);
            usuario.setTwoFactorSecret(null);
            // Clear replay protection fields
            usuario.setTotpLastUsedOtp(null);
            usuario.setTotpLastUsedAt(null);
            // Only clear recovery codes if ALL 2FA is disabled
            if (!Boolean.TRUE.equals(usuario.getTwoFactorEnabled())) {
                usuario.setRecoveryCodes(null);
            }
            usuarioService.guardar(usuario);
            return ResponseEntity.ok(ResponseDTO.success("App de autenticación desactivada correctamente",
                Map.of("methods", usuario.getActiveMethods())));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al desactivar 2FA"));
        }
    }

    public ResponseEntity<ResponseDTO> status2FA(HttpServletRequest request) {
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            boolean enabled = Boolean.TRUE.equals(usuario.getTwoFactorEnabled());
            return ResponseEntity.ok(ResponseDTO.success("OK", Map.of(
                "enabled",          enabled,
                "methods",          usuario.getActiveMethods(),
                "totpEnabled",      usuario.hasTotpEnabled(),
                "emailOtpEnabled",  usuario.hasEmailOtpEnabled()
            )));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al consultar estado 2FA"));
        }
    }
}
