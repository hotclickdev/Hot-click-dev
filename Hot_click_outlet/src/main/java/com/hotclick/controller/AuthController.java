package com.hotclick.controller;

import com.hotclick.dto.AuthResponse;
import com.hotclick.dto.JwtRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.EmailVerificationService;
import com.hotclick.service.PasswordResetService;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.TwoFactorService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired private UsuarioService            usuarioService;
    @Autowired private JwtUtil                   jwtUtil;
    @Autowired private PasswordResetService      passwordResetService;
    @Autowired private EmailVerificationService  emailVerificationService;
    @Autowired private TwoFactorService          twoFactorService;
    @Autowired private RefreshTokenService       refreshTokenService;
    @Autowired private PasswordEncoder           passwordEncoder;

    // ── Registro ──────────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<ResponseDTO> register(@RequestBody Usuario usuario) {
        try {
            usuario.setContrasenaHash(passwordEncoder.encode(usuario.getContrasenaHash()));
            Usuario nuevo = usuarioService.registrarSolicitud(usuario);
            return ResponseEntity.ok(ResponseDTO.success(
                "Solicitud enviada. Un administrador revisará y activará tu cuenta pronto.", nuevo));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody JwtRequest request) {
        Optional<Usuario> usuarioOpt = usuarioService.buscarPorCorreo(request.getCorreo());
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        Usuario usuario = usuarioOpt.get();

        // [FIX-1] Verificar bloqueo por intentos fallidos antes de validar contraseña
        if (usuario.getBloqueadoHasta() != null && LocalDateTime.now().isBefore(usuario.getBloqueadoHasta())) {
            log.warn("Login bloqueado para {}: cuenta bloqueada hasta {}", request.getCorreo(), usuario.getBloqueadoHasta());
            return ResponseEntity.status(403).body(ResponseDTO.error(
                "Cuenta temporalmente bloqueada por múltiples intentos fallidos. Intentá más tarde."));
        }

        if (!passwordEncoder.matches(request.getContrasena(), usuario.getContrasenaHash())) {
            usuarioService.incrementarIntentosFallidos(usuario.getId());
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        int estado = usuario.getEstado() == null ? 0 : usuario.getEstado();
        if (estado == Constants.ESTADO_PENDIENTE) {
            return ResponseEntity.status(403).body(ResponseDTO.error(
                "Debes verificar tu correo antes de iniciar sesión. Revisá tu bandeja de entrada."));
        }
        if (estado == Constants.ESTADO_INACTIVO || estado == Constants.ESTADO_SUSPENDIDO) {
            return ResponseEntity.status(403).body(ResponseDTO.error(
                "Tu cuenta no está activa. Contactá al administrador."));
        }
        if (estado == Constants.ESTADO_ELIMINADO) {
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        usuarioService.resetearIntentosFallidos(usuario.getId());
        usuarioService.actualizarUltimoAcceso(usuario.getId());

        if (Boolean.TRUE.equals(usuario.getTwoFactorEnabled())) {
            String tempToken = jwtUtil.generateTempToken(usuario.getCorreo(), usuario.getId());
            return ResponseEntity.ok(Map.of(
                "success",     true,
                "requires2fa", true,
                "tempToken",   tempToken,
                "message",     "Ingresá el código de tu app de autenticación"
            ));
        }

        return ResponseEntity.ok(buildAuthResponse(usuario));
    }

    // ── Refresh access token ──────────────────────────────────────────────────

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        String tokenStr = body.get("refreshToken");
        if (tokenStr == null || tokenStr.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Refresh token requerido"));
        }
        try {
            RefreshToken rt = refreshTokenService.validar(tokenStr);
            Usuario usuario = rt.getUsuario();
            String rol = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
            String newAccessToken = jwtUtil.generateToken(usuario.getCorreo(), usuario.getId(), rol);
            return ResponseEntity.ok(Map.of(
                "accessToken", newAccessToken,
                "tipo",        "Bearer"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── Logout — revoca refresh token ─────────────────────────────────────────

    @PostMapping("/logout")
    public ResponseEntity<ResponseDTO> logout(@RequestBody Map<String, String> body) {
        String tokenStr = body.get("refreshToken");
        if (tokenStr != null && !tokenStr.isBlank()) {
            refreshTokenService.revocar(tokenStr);
        }
        return ResponseEntity.ok(ResponseDTO.success("Sesión cerrada correctamente", null));
    }

    // ── Cambiar contraseña (autenticado) ──────────────────────────────────────

    @PostMapping("/change-password")
    public ResponseEntity<ResponseDTO> changePassword(@RequestBody Map<String, String> body,
                                                      HttpServletRequest request) {
        String actual = body.get("contrasenaActual");
        String nueva  = body.get("nuevaContrasena");

        if (actual == null || nueva == null || nueva.length() < 6) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("La nueva contraseña debe tener al menos 6 caracteres"));
        }
        try {
            Usuario usuario = usuarioFromRequest(request);
            if (!passwordEncoder.matches(actual, usuario.getContrasenaHash())) {
                return ResponseEntity.status(401).body(ResponseDTO.error("La contraseña actual es incorrecta"));
            }
            usuario.setContrasenaHash(passwordEncoder.encode(nueva));
            usuarioService.guardar(usuario);
            // Revocar todos los refresh tokens para forzar re-login en otros dispositivos
            refreshTokenService.revocar(body.getOrDefault("refreshToken", ""));
            return ResponseEntity.ok(ResponseDTO.success("Contraseña actualizada correctamente", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al cambiar la contraseña"));
        }
    }

    // ── 2FA: Verificar código durante login ───────────────────────────────────

    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verify2FA(@RequestBody Map<String, String> body) {
        String tempToken    = body.get("tempToken");
        String code         = body.get("code");
        String recoveryCode = body.get("recoveryCode");

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
                return ResponseEntity.status(401).body(ResponseDTO.error("Usuario no encontrado"));
            }

            Usuario usuario = opt.get();

            if (usuario.getBloqueadoHasta() != null && LocalDateTime.now().isBefore(usuario.getBloqueadoHasta())) {
                return ResponseEntity.status(403).body(ResponseDTO.error(
                    "Cuenta temporalmente bloqueada. Intentá más tarde."));
            }

            // Verificación con código de recuperación
            if (recoveryCode != null && !recoveryCode.isBlank()) {
                String normalized = twoFactorService.normalizeRecoveryCode(recoveryCode);
                List<String> stored = new ArrayList<>(twoFactorService.jsonToCodes(usuario.getRecoveryCodes()));
                int matchIdx = -1;
                for (int i = 0; i < stored.size(); i++) {
                    if (passwordEncoder.matches(normalized, stored.get(i))) { matchIdx = i; break; }
                }
                if (matchIdx < 0) {
                    usuarioService.incrementarIntentosFallidos(usuario.getId());
                    log.warn("Código de recuperación inválido para {}", correo);
                    return ResponseEntity.status(401).body(ResponseDTO.error("Código de recuperación inválido"));
                }
                stored.remove(matchIdx);
                usuario.setRecoveryCodes(twoFactorService.codesToJson(stored));
                usuarioService.guardar(usuario);
                usuarioService.resetearIntentosFallidos(usuario.getId());
                int remaining = stored.size();
                log.info("Login con código de recuperación para {}. Códigos restantes: {}", correo, remaining);
                return ResponseEntity.ok(buildAuthResponse(usuario));
            }

            // Verificación TOTP estándar
            if (!twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code)) {
                usuarioService.incrementarIntentosFallidos(usuario.getId());
                log.warn("Código 2FA incorrecto para {}", correo);
                return ResponseEntity.status(401).body(ResponseDTO.error("Código incorrecto o expirado"));
            }

            usuarioService.resetearIntentosFallidos(usuario.getId());
            return ResponseEntity.ok(buildAuthResponse(usuario));

        } catch (Exception e) {
            return ResponseEntity.status(401).body(ResponseDTO.error("Token expirado o inválido"));
        }
    }

    // ── 2FA: Setup ────────────────────────────────────────────────────────────

    @PostMapping("/2fa/setup")
    public ResponseEntity<ResponseDTO> setup2FA(HttpServletRequest request) {
        try {
            Usuario usuario = usuarioFromRequest(request);
            String secret = twoFactorService.generateSecret();
            usuario.setTwoFactorSecret(secret);
            usuario.setTwoFactorEnabled(false);
            usuarioService.guardar(usuario);
            String qrUri = twoFactorService.buildQrUri(usuario.getCorreo(), secret);
            return ResponseEntity.ok(ResponseDTO.success(
                "Escanea el código QR con Google Authenticator y luego ingresá el código para activar",
                Map.of("secret", secret, "qrUri", qrUri)
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al configurar 2FA"));
        }
    }

    // ── 2FA: Activar ──────────────────────────────────────────────────────────

    @PostMapping("/2fa/activate")
    public ResponseEntity<ResponseDTO> activate2FA(@RequestBody Map<String, String> body,
                                                    HttpServletRequest request) {
        String code = body.get("code");
        if (code == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Código requerido"));
        }
        try {
            Usuario usuario = usuarioFromRequest(request);
            if (usuario.getTwoFactorSecret() == null) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Primero iniciá la configuración 2FA"));
            }
            if (!twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code)) {
                return ResponseEntity.status(400).body(ResponseDTO.error("Código incorrecto o expirado"));
            }
            usuario.setTwoFactorEnabled(true);

            List<String> plainCodes  = twoFactorService.generateRecoveryCodes();
            List<String> hashedCodes = plainCodes.stream()
                    .map(c -> passwordEncoder.encode(twoFactorService.normalizeRecoveryCode(c)))
                    .collect(Collectors.toList());
            usuario.setRecoveryCodes(twoFactorService.codesToJson(hashedCodes));

            usuarioService.guardar(usuario);
            return ResponseEntity.ok(ResponseDTO.success(
                "Autenticación de dos factores activada correctamente",
                Map.of("recoveryCodes", plainCodes)
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al activar 2FA"));
        }
    }

    // ── 2FA: Desactivar ───────────────────────────────────────────────────────

    @PostMapping("/2fa/disable")
    public ResponseEntity<ResponseDTO> disable2FA(@RequestBody Map<String, String> body,
                                                   HttpServletRequest request) {
        String contrasena = body.get("contrasena");
        String code       = body.get("code");

        if (contrasena == null || code == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Contraseña y código son requeridos"));
        }
        try {
            Usuario usuario = usuarioFromRequest(request);
            if (!passwordEncoder.matches(contrasena, usuario.getContrasenaHash())) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Contraseña incorrecta"));
            }
            if (!twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code)) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Código de autenticación incorrecto"));
            }
            usuario.setTwoFactorEnabled(false);
            usuario.setTwoFactorSecret(null);
            usuarioService.guardar(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Autenticación de dos factores desactivada correctamente", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al desactivar 2FA"));
        }
    }

    // ── 2FA: Regenerar códigos de recuperación ────────────────────────────────

    @PostMapping("/2fa/recovery-codes/regenerate")
    public ResponseEntity<ResponseDTO> regenerateRecoveryCodes(@RequestBody Map<String, String> body,
                                                               HttpServletRequest request) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Código TOTP requerido"));
        }
        try {
            Usuario usuario = usuarioFromRequest(request);
            if (!Boolean.TRUE.equals(usuario.getTwoFactorEnabled())) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("El 2FA no está activado"));
            }
            if (!twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code)) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Código incorrecto o expirado"));
            }
            List<String> plainCodes  = twoFactorService.generateRecoveryCodes();
            List<String> hashedCodes = plainCodes.stream()
                    .map(c -> passwordEncoder.encode(twoFactorService.normalizeRecoveryCode(c)))
                    .collect(Collectors.toList());
            usuario.setRecoveryCodes(twoFactorService.codesToJson(hashedCodes));
            usuarioService.guardar(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Códigos de recuperación regenerados",
                    Map.of("recoveryCodes", plainCodes)));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al regenerar códigos"));
        }
    }

    // ── 2FA: Estado ───────────────────────────────────────────────────────────

    @GetMapping("/2fa/status")
    public ResponseEntity<ResponseDTO> status2FA(HttpServletRequest request) {
        try {
            Usuario usuario = usuarioFromRequest(request);
            boolean enabled = Boolean.TRUE.equals(usuario.getTwoFactorEnabled());
            return ResponseEntity.ok(ResponseDTO.success("OK", Map.of("enabled", enabled)));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al consultar estado 2FA"));
        }
    }

    // ── Verificación por correo ───────────────────────────────────────────────

    @PostMapping("/send-verification")
    public ResponseEntity<ResponseDTO> sendVerification(@RequestBody Usuario usuario) {
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

    @PostMapping("/verify-registration")
    public ResponseEntity<ResponseDTO> verifyRegistration(@RequestBody Map<String, String> body) {
        String correo = body.get("correo");
        String codigo = body.get("codigo");
        if (correo == null || codigo == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Correo y código son requeridos"));
        }
        try {
            Usuario nuevo = emailVerificationService.verificarYRegistrar(correo.trim(), codigo.trim());
            return ResponseEntity.ok(ResponseDTO.success("Cuenta creada exitosamente", buildAuthResponse(nuevo)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── Recuperar contraseña ──────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<ResponseDTO> forgotPassword(@RequestBody Map<String, String> body) {
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

    @PostMapping("/verify-code")
    public ResponseEntity<ResponseDTO> verifyCode(@RequestBody Map<String, String> body) {
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

    @PostMapping("/reset-password")
    public ResponseEntity<ResponseDTO> resetPassword(@RequestBody Map<String, String> body) {
        String correo          = body.get("correo");
        String nuevaContrasena = body.get("nuevaContrasena");
        if (correo == null || nuevaContrasena == null || nuevaContrasena.length() < 6) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("La contraseña debe tener al menos 6 caracteres"));
        }
        boolean ok = passwordResetService.cambiarContrasena(correo.trim(), nuevaContrasena);
        if (ok) return ResponseEntity.ok(ResponseDTO.success("Contraseña actualizada correctamente", null));
        return ResponseEntity.status(400).body(ResponseDTO.error("Sesión de recuperación inválida o expirada"));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private AuthResponse buildAuthResponse(Usuario usuario) {
        String rol         = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
        String accessToken = jwtUtil.generateToken(usuario.getCorreo(), usuario.getId(), rol);
        RefreshToken rt    = refreshTokenService.crear(usuario);
        String nombre      = usuario.getNombre() != null ? usuario.getNombre() : usuario.getCorreo().split("@")[0];
        return new AuthResponse(accessToken, rt.getToken(), usuario.getId(), usuario.getCorreo(), rol, nombre);
    }

    private Usuario usuarioFromRequest(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new SecurityException("Token de autenticación requerido");
        }
        Long userId = jwtUtil.extractUserId(auth.substring(7));
        return usuarioService.buscarPorId(userId)
                .orElseThrow(() -> new SecurityException("Usuario no encontrado"));
    }
}
