package com.hotclick.controller;

import com.hotclick.dto.AuthResponse;
import com.hotclick.model.RefreshToken;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.WebAuthnService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/webauthn")
public class WebAuthnController {

    private final WebAuthnService     webAuthnService;
    private final UsuarioRepository   usuarioRepo;
    private final JwtUtil             jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final PermisoRepository   permisoRepository;

    public WebAuthnController(WebAuthnService webAuthnService,
                              UsuarioRepository usuarioRepo,
                              JwtUtil jwtUtil,
                              RefreshTokenService refreshTokenService,
                              PermisoRepository permisoRepository) {
        this.webAuthnService     = webAuthnService;
        this.usuarioRepo         = usuarioRepo;
        this.jwtUtil             = jwtUtil;
        this.refreshTokenService = refreshTokenService;
        this.permisoRepository   = permisoRepository;
    }

    // ── Registro (requiere estar autenticado como ADMIN) ─────────────────

    @PostMapping("/register/start")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> registerStart(
            @RequestBody Map<String, String> body,
            @RequestAttribute("authenticatedEmail") String email) {
        try {
            String deviceName = body.getOrDefault("deviceName", "Llave de seguridad");
            String options = webAuthnService.startRegistration(email, deviceName);
            return ResponseEntity.ok(Map.of("options", options));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/register/finish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> registerFinish(
            @RequestBody Map<String, String> body,
            @RequestAttribute("authenticatedEmail") String email) {
        try {
            String response   = body.get("response");
            String deviceName = body.getOrDefault("deviceName", "Llave de seguridad");
            webAuthnService.finishRegistration(email, response, deviceName);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Autenticación (público — paso 2 del login para ADMIN) ───────────

    @PostMapping("/login/start")
    public ResponseEntity<?> loginStart(@RequestBody Map<String, String> body) {
        try {
            String email   = body.get("email");
            String options = webAuthnService.startAuthentication(email);
            return ResponseEntity.ok(Map.of("options", options));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login/finish")
    public ResponseEntity<?> loginFinish(@RequestBody Map<String, String> body) {
        try {
            String email    = body.get("email");
            String response = body.get("response");
            boolean ok      = webAuthnService.finishAuthentication(email, response);
            if (!ok) return ResponseEntity.status(401).body(Map.of("error", "Autenticación WebAuthn fallida"));

            var usuario = usuarioRepo.findByCorreo(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

            String rol         = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
            String empresaSlug = usuario.getEmpresa() != null ? usuario.getEmpresa().getSlug()          : null;
            String empresaNom  = usuario.getEmpresa() != null ? usuario.getEmpresa().getNombreEmpresa()  : null;
            List<String> perms = permisoRepository.findPermisosByUsuarioId(usuario.getId());

            String accessToken = jwtUtil.generateTokenFull(
                usuario.getCorreo(), usuario.getId(), rol, usuario.getEmpresaId(), empresaSlug, perms);
            RefreshToken rt = refreshTokenService.crear(usuario);

            String nombre = usuario.getNombre() != null ? usuario.getNombre() : email.split("@")[0];
            AuthResponse auth = new AuthResponse(accessToken, rt.getToken(), usuario.getId(), email, rol, nombre);
            auth.setEmpresaId(usuario.getEmpresaId());
            auth.setEmpresaSlug(empresaSlug);
            auth.setEmpresaNombre(empresaNom);
            auth.setPermisos(perms);
            return ResponseEntity.ok(auth);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Autenticación WebAuthn fallida"));
        }
    }

    // ── Consultar si el usuario tiene credenciales registradas ──────────────

    @GetMapping("/credentials")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> listCredentials(@RequestAttribute("authenticatedEmail") String email) {
        boolean tiene = webAuthnService.tieneCredenciales(email);
        return ResponseEntity.ok(Map.of("hasCredentials", tiene));
    }
}
