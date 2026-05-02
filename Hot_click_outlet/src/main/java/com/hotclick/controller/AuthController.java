package com.hotclick.controller;

import com.hotclick.dto.JwtRequest;
import com.hotclick.dto.JwtResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.EmailVerificationService;
import com.hotclick.service.PasswordResetService;
import com.hotclick.service.TwoFactorService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private UsuarioService       usuarioService;
    @Autowired private JwtUtil              jwtUtil;
    @Autowired private PasswordResetService passwordResetService;
    @Autowired private EmailVerificationService emailVerificationService;
    @Autowired private TwoFactorService     twoFactorService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

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

    // ── Login (incluye paso 2FA) ───────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody JwtRequest request) {
        Optional<Usuario> usuarioOpt = usuarioService.buscarPorCorreo(request.getCorreo());
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        Usuario usuario = usuarioOpt.get();

        if (!passwordEncoder.matches(request.getContrasena(), usuario.getContrasenaHash())) {
            usuarioService.incrementarIntentosFallidos(usuario.getId());
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        // Verificar estado de la cuenta antes de generar el token
        int estado = usuario.getEstado() == null ? 0 : usuario.getEstado();
        if (estado == Constants.ESTADO_PENDIENTE) {
            return ResponseEntity.status(403).body(ResponseDTO.error(
                "Tu cuenta está pendiente de aprobación. Un administrador la revisará pronto."));
        }
        if (estado == Constants.ESTADO_INACTIVO || estado == Constants.ESTADO_SUSPENDIDO) {
            return ResponseEntity.status(403).body(ResponseDTO.error(
                "Tu cuenta no está activa. Contacta al administrador."));
        }
        if (estado == Constants.ESTADO_ELIMINADO) {
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        usuarioService.resetearIntentosFallidos(usuario.getId());
        usuarioService.actualizarUltimoAcceso(usuario.getId());

        // Si el usuario tiene 2FA activo, devolver token temporal en lugar del JWT final
        if (Boolean.TRUE.equals(usuario.getTwoFactorEnabled())) {
            String tempToken = jwtUtil.generateTempToken(usuario.getCorreo(), usuario.getId());
            return ResponseEntity.ok(Map.of(
                "success",    true,
                "requires2fa", true,
                "tempToken",  tempToken,
                "message",    "Ingresa el código de tu app de autenticación"
            ));
        }

        String rol   = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
        String token = jwtUtil.generateToken(usuario.getCorreo(), usuario.getId(), rol);
        return ResponseEntity.ok(new JwtResponse(token, usuario.getId(), usuario.getCorreo(), rol));
    }

    // ── 2FA: Verificar código durante login ───────────────────────────────────

    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verify2FA(@RequestBody Map<String, String> body) {
        String tempToken = body.get("tempToken");
        String code      = body.get("code");

        if (tempToken == null || code == null) {
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
            if (!twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code)) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Código incorrecto o expirado"));
            }

            String rol   = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
            String token = jwtUtil.generateToken(correo, usuario.getId(), rol);
            return ResponseEntity.ok(new JwtResponse(token, usuario.getId(), correo, rol));

        } catch (Exception e) {
            return ResponseEntity.status(401).body(ResponseDTO.error("Token expirado o inválido"));
        }
    }

    // ── 2FA: Setup — genera secret + URI para QR ─────────────────────────────

    @PostMapping("/2fa/setup")
    public ResponseEntity<ResponseDTO> setup2FA(HttpServletRequest request) {
        try {
            Usuario usuario = usuarioFromRequest(request);

            String secret = twoFactorService.generateSecret();
            // Guardar el secret (sin activar aún — se activa al verificar el primer código)
            usuario.setTwoFactorSecret(secret);
            usuario.setTwoFactorEnabled(false);
            usuarioService.guardar(usuario);

            String qrUri = twoFactorService.buildQrUri(usuario.getCorreo(), secret);
            return ResponseEntity.ok(ResponseDTO.success(
                "Escanea el código QR con Google Authenticator y luego ingresa el código para activar",
                Map.of("secret", secret, "qrUri", qrUri)
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al configurar 2FA"));
        }
    }

    // ── 2FA: Activar — verifica el código y activa 2FA ───────────────────────

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
                return ResponseEntity.badRequest().body(ResponseDTO.error("Primero inicia la configuración 2FA"));
            }
            if (!twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code)) {
                return ResponseEntity.status(400).body(ResponseDTO.error("Código incorrecto o expirado"));
            }

            usuario.setTwoFactorEnabled(true);
            usuarioService.guardar(usuario);
            return ResponseEntity.ok(ResponseDTO.success("2FA activado correctamente", null));

        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al activar 2FA"));
        }
    }

    // ── 2FA: Desactivar — requiere contraseña + código TOTP ──────────────────

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
            return ResponseEntity.ok(ResponseDTO.success("2FA desactivado correctamente", null));

        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al desactivar 2FA"));
        }
    }

    // ── 2FA: Estado actual ────────────────────────────────────────────────────

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

    // ── Recuperar contraseña ──────────────────────────────────────────────────

    @PostMapping("/send-verification")
    public ResponseEntity<ResponseDTO> sendVerification(@RequestBody Usuario usuario) {
        try {
            usuario.setContrasenaHash(passwordEncoder.encode(usuario.getContrasenaHash()));
            emailVerificationService.iniciarRegistro(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Código de verificación enviado a tu correo", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
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
            return ResponseEntity.ok(ResponseDTO.success("Cuenta creada exitosamente", nuevo));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ResponseDTO> forgotPassword(@RequestBody Map<String, String> body) {
        String correo = body.get("correo");
        if (correo == null || correo.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El correo es requerido"));
        }
        try {
            passwordResetService.enviarCodigo(correo.trim());
            return ResponseEntity.ok(ResponseDTO.success("Si el correo está registrado, recibirás un código de verificación", null));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al enviar el correo"));
        }
    }

    @PostMapping("/verify-code")
    public ResponseEntity<ResponseDTO> verifyCode(@RequestBody Map<String, String> body) {
        String correo = body.get("correo");
        String codigo = body.get("codigo");
        if (correo == null || codigo == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Correo y código son requeridos"));
        }
        boolean ok = passwordResetService.verificarCodigo(correo.trim(), codigo.trim());
        if (ok) return ResponseEntity.ok(ResponseDTO.success("Código verificado correctamente", null));
        return ResponseEntity.status(400).body(ResponseDTO.error("Código inválido o expirado"));
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

    // ── Helper privado ────────────────────────────────────────────────────────

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
