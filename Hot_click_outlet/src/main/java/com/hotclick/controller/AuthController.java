package com.hotclick.controller;

import com.hotclick.dto.JwtRequest;
import com.hotclick.dto.JwtResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.EmailVerificationService;
import com.hotclick.service.PasswordResetService;
import com.hotclick.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private EmailVerificationService emailVerificationService;

    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/register")
    public ResponseEntity<ResponseDTO> register(@RequestBody Usuario usuario) {
        try {
            usuario.setContrasenaHash(passwordEncoder.encode(usuario.getContrasenaHash()));
            Usuario nuevoUsuario = usuarioService.registrarUsuario(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Usuario registrado exitosamente", nuevoUsuario));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody JwtRequest request) {
        var usuarioOpt = usuarioService.buscarPorCorreo(request.getCorreo());

        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        Usuario usuario = usuarioOpt.get();

        if (!passwordEncoder.matches(request.getContrasena(), usuario.getContrasenaHash())) {
            usuarioService.incrementarIntentosFallidos(usuario.getId());
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        usuarioService.resetearIntentosFallidos(usuario.getId());
        usuarioService.actualizarUltimoAcceso(usuario.getId());

        String rol = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
        String token = jwtUtil.generateToken(usuario.getCorreo(), usuario.getId(), rol);

        return ResponseEntity.ok(new JwtResponse(token, usuario.getId(), usuario.getCorreo(), rol));
    }

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
        if (ok) {
            return ResponseEntity.ok(ResponseDTO.success("Código verificado correctamente", null));
        }
        return ResponseEntity.status(400).body(ResponseDTO.error("Código inválido o expirado"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ResponseDTO> resetPassword(@RequestBody Map<String, String> body) {
        String correo = body.get("correo");
        String nuevaContrasena = body.get("nuevaContrasena");
        if (correo == null || nuevaContrasena == null || nuevaContrasena.length() < 6) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("La contraseña debe tener al menos 6 caracteres"));
        }
        boolean ok = passwordResetService.cambiarContrasena(correo.trim(), nuevaContrasena);
        if (ok) {
            return ResponseEntity.ok(ResponseDTO.success("Contraseña actualizada correctamente", null));
        }
        return ResponseEntity.status(400).body(ResponseDTO.error("Sesión de recuperación inválida o expirada"));
    }
}
