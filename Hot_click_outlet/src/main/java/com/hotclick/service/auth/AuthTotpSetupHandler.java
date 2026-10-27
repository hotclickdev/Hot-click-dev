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

    private static final String MSG_CONTRASENA_REQUERIDA =
        "Ingresá tu contraseña actual para configurar el 2FA";
    /** Mismo cuerpo para contraseña mala y código malo: no revela cuál de los dos falló. */
    static final String MSG_DISABLE_CREDENCIALES = "Contraseña o código incorrecto";

    /**
     * Configurar el 2FA exige siempre la contraseña actual, con el 2FA activo o no: sin esto, una sesión
     * robada podía armar un segundo factor propio. Con la app (TOTP) ya activa pide además el código vigente.
     * El secreto nuevo queda PENDIENTE ({@code twoFactorPendingSecret}) hasta que {@link #activate2FA} valide un código; el secreto vigente, los
     * métodos activos y {@code twoFactorEnabled} no se tocan, así un setup abandonado no apaga el 2FA.
     */
    public ResponseEntity<ResponseDTO> setup2FA(Map<String, String> body, HttpServletRequest request) {
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            var limitado = authSupport.limite2faUsuario(usuario.getId());
            if (limitado != null) return limitado;
            boolean contrasenaOk = contrasenaVigente(usuario, body);
            if (usuario.hasTotpEnabled()) {
                // Rotar un secreto TOTP vigente exige además el código actual: la contraseña sola (o una sesión robada
                // con la contraseña) no alcanza para sustituir el segundo factor. Se evalúan SIEMPRE los dos y se
                // responde el mismo 401 que disable, sin revelar cuál de los dos falló.
                boolean codigoOk = codigoVigente(usuario, body);
                if (!contrasenaOk || !codigoOk) {
                    return ResponseEntity.status(401).body(ResponseDTO.error(MSG_DISABLE_CREDENCIALES));
                }
            } else if (!contrasenaOk) {
                return ResponseEntity.status(401).body(ResponseDTO.error(MSG_CONTRASENA_REQUERIDA));
            }
            String plainSecret  = twoFactorService.generateSecret();
            String encSecret    = twoFactorService.encryptForStorage(plainSecret);  // AES-256-GCM
            usuario.setTwoFactorPendingSecret(encSecret);   // pendiente: no reemplaza al vigente hasta activar
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

    private boolean codigoVigente(Usuario usuario, Map<String, String> body) {
        String code = body == null ? null : body.get("code");
        return code != null && !code.isBlank() && usuario.getTwoFactorSecret() != null
                && twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code);
    }

    private boolean contrasenaVigente(Usuario usuario, Map<String, String> body) {
        if (body == null) return false;
        String contrasena = body.get("contrasena");
        return contrasena != null && !contrasena.isBlank() && usuario.getContrasenaHash() != null
                && passwordEncoder.matches(contrasena, usuario.getContrasenaHash());
    }

    /** Secreto contra el que se valida el código de activación: el pendiente o, en setups previos al cambio, el sin activar. */
    private String secretoPorActivar(Usuario usuario) {
        if (usuario.getTwoFactorPendingSecret() != null) return usuario.getTwoFactorPendingSecret();
        // Setup iniciado antes de existir el secreto pendiente: el secreto quedó sin activar (TOTP no activo).
        return usuario.hasTotpEnabled() ? null : usuario.getTwoFactorSecret();
    }

    public ResponseEntity<ResponseDTO> activate2FA(Map<String, String> body, HttpServletRequest request) {
        String code = body == null ? null : body.get("code");
        if (code == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Código requerido"));
        }
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            var limitado = authSupport.limite2faUsuario(usuario.getId());
            if (limitado != null) return limitado;
            if (!contrasenaVigente(usuario, body)) {
                return ResponseEntity.status(401).body(ResponseDTO.error(MSG_CONTRASENA_REQUERIDA));
            }
            String porActivar = secretoPorActivar(usuario);
            if (porActivar == null) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Primero iniciá la configuración 2FA"));
            }
            if (!twoFactorService.verifyCode(porActivar, code)) {
                return ResponseEntity.status(400).body(ResponseDTO.error("Código incorrecto o expirado"));
            }
            // El código validó: recién ahora el secreto pendiente pasa a ser el vigente.
            usuario.setTwoFactorSecret(porActivar);
            usuario.setTwoFactorPendingSecret(null);
            usuario.setTotpLastUsedOtp(null);
            usuario.setTotpLastUsedAt(null);
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
            return ResponseEntity.status(401).body(ResponseDTO.error(MSG_DISABLE_CREDENCIALES));
        }
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            var limitado = authSupport.limite2faUsuario(usuario.getId());
            if (limitado != null) return limitado;
            if (usuario.getTwoFactorSecret() == null) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("La app de autenticación no está activa"));
            }
            // Se evalúan los dos factores siempre y se responde igual: sin oráculo de cuál falló.
            boolean contrasenaOk = usuario.getContrasenaHash() != null
                    && passwordEncoder.matches(contrasena, usuario.getContrasenaHash());
            boolean codigoOk = twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code);
            if (!contrasenaOk || !codigoOk) {
                return ResponseEntity.status(401).body(ResponseDTO.error(MSG_DISABLE_CREDENCIALES));
            }
            // Remove TOTP from methods; leave EMAIL_OTP if it exists
            usuario.removeMethod(Constants.METODO_2FA_TOTP);
            usuario.setTwoFactorSecret(null);
            usuario.setTwoFactorPendingSecret(null);
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
