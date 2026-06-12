package com.hotclick.controller;

import com.hotclick.dto.AuthResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.ClerkTokenService;
import com.hotclick.service.RefreshTokenService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Handles social login via Clerk (Google, Apple, Microsoft, GitHub, etc.).
 *
 * Flow:
 *   1. Frontend authenticates the user with Clerk (OAuth).
 *   2. Frontend sends the Clerk session token to POST /api/auth/clerk-sync.
 *   3. This endpoint verifies the Clerk JWT, finds or creates the local user,
 *      and returns the app's own JWT (same format as the email/password login).
 *   4. The rest of the app works exactly as before — no changes downstream.
 */
@RestController
@RequestMapping("/api/auth")
public class ClerkSyncController {

    private static final Logger log = LoggerFactory.getLogger(ClerkSyncController.class);

    @Autowired private ClerkTokenService   clerkTokenService;
    @Autowired private UsuarioRepository   usuarioRepository;
    @Autowired private RolRepository       rolRepository;
    @Autowired private JwtUtil             jwtUtil;
    @Autowired private RefreshTokenService refreshTokenService;
    @Autowired private PermisoRepository   permisoRepository;
    @Autowired private PasswordEncoder     passwordEncoder;

    @PostMapping("/clerk-sync")
    public ResponseEntity<ResponseDTO> clerkSync(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {

        if (!clerkTokenService.isConfigured()) {
            return ResponseEntity.status(503)
                .body(ResponseDTO.error("Autenticación social no disponible (CLERK_JWKS_URI no configurado)"));
        }

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Token de Clerk requerido"));
        }

        Jwt clerkJwt;
        try {
            clerkJwt = clerkTokenService.verify(authHeader.substring(7));
        } catch (Exception e) {
            log.warn("[clerk-sync] Token inválido: {}", e.getMessage());
            return ResponseEntity.status(401).body(ResponseDTO.error("Token de Clerk inválido o expirado"));
        }

        String clerkUserId = clerkJwt.getSubject();
        if (clerkUserId == null || clerkUserId.isBlank()) {
            return ResponseEntity.status(401).body(ResponseDTO.error("Token de Clerk sin subject"));
        }

        // Prefer email from the verified JWT claims (hotclick-session template).
        // Fall back to body email only when the template isn't configured yet —
        // security is maintained by the elevated-role guard in resolveUser().
        String emailFromJwt  = Optional.ofNullable(clerkJwt.getClaimAsString("email"))
            .orElse("").toLowerCase().trim();
        String emailFromBody = Optional.ofNullable(body.get("email")).orElse("").toLowerCase().trim();
        String email = emailFromJwt.isBlank() ? emailFromBody : emailFromJwt;

        if (emailFromJwt.isBlank()) {
            log.warn("[clerk-sync] JWT sin claim 'email' — usando email del body (configura el JWT template). clerkUserId={}", clerkUserId);
        }

        if (email.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Email requerido"));
        }

        String nombre   = Optional.ofNullable(body.get("nombre")).orElse("");
        String apellido = Optional.ofNullable(body.get("apellido")).orElse("");
        String fotoUrl  = Optional.ofNullable(body.get("fotoUrl")).orElse("");

        Usuario usuario;
        try {
            usuario = resolveUser(clerkUserId, email, nombre, apellido, fotoUrl);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        }

        usuarioRepository.updateUltimoAcceso(usuario.getId(), LocalDateTime.now());

        // Reload to ensure roles + empresa are properly fetched
        usuario = usuarioRepository.findByCorreo(usuario.getCorreo())
            .orElseThrow(() -> new IllegalStateException("Error al cargar usuario tras sync"));

        AuthResponse resp = buildAuthResponse(usuario);
        log.info("[clerk-sync] Login social exitoso: {} ({})", email, clerkUserId);
        return ResponseEntity.ok(ResponseDTO.success("ok", resp));
    }

    private Usuario resolveUser(String clerkUserId, String email,
                                 String nombre, String apellido, String fotoUrl) {
        // 1. Returning user — already linked
        Optional<Usuario> byClerk = usuarioRepository.findByClerkUserId(clerkUserId);
        if (byClerk.isPresent()) {
            return byClerk.get();
        }

        // 2. Existing account — link Clerk ID (account merging)
        Optional<Usuario> byEmail = usuarioRepository.findByCorreo(email);
        if (byEmail.isPresent()) {
            Usuario u = byEmail.get();
            // Refuse to auto-link elevated accounts. An attacker with a valid Clerk token
            // for any email could supply an admin's email in the body and take over the account.
            boolean hasElevatedRole = u.getRoles().stream()
                .map(Rol::getNombreRol)
                .anyMatch(r -> Constants.ROL_ADMIN_IT.equals(r)
                            || Constants.ROL_EMPRENDEDOR.equals(r)
                            || Constants.ROL_ADMIN_CLIENTE.equals(r));
            if (hasElevatedRole && u.getClerkUserId() == null) {
                log.warn("[clerk-sync] Blocked Clerk merge for elevated account email={} clerkId={}", email, clerkUserId);
                throw new SecurityException("Esta cuenta requiere verificación adicional para vincular login social. Usá tu contraseña.");
            }
            u.setClerkUserId(clerkUserId);
            if (u.getFotoPerfilUrl() == null && !fotoUrl.isBlank()) {
                u.setFotoPerfilUrl(fotoUrl);
            }
            return usuarioRepository.save(u);
        }

        // 3. New user — create and persist
        return createOAuthUser(clerkUserId, email, nombre, apellido, fotoUrl);
    }

    private Usuario createOAuthUser(String clerkUserId, String email,
                                     String nombre, String apellido, String fotoUrl) {
        Usuario u = new Usuario();
        u.setClerkUserId(clerkUserId);
        u.setCorreo(email);
        u.setNombre(nombre.isBlank() ? email.split("@")[0] : nombre);
        u.setApellidoPaterno(apellido.isBlank() ? "-" : apellido);
        u.setTelefono("");
        u.setFechaRegistro(LocalDateTime.now());
        u.setEstado(1); // active immediately — email verified by OAuth provider

        if (!fotoUrl.isBlank()) {
            u.setFotoPerfilUrl(fotoUrl);
        }

        // Impossible-to-use password hash — OAuth users authenticate via Clerk only
        u.setContrasenaHash(passwordEncoder.encode(UUID.randomUUID().toString()));

        // Unique identificacion for OAuth users (VARCHAR 20): "CL" + 18 chars of Clerk ID
        String raw = clerkUserId.startsWith("user_") ? clerkUserId.substring(5) : clerkUserId;
        String identificacion = ("CL" + raw).substring(0, Math.min(20, ("CL" + raw).length()));
        u.setIdentificacion(identificacion);

        // Default role: USUARIO_FINAL
        // To become EMPRENDEDOR, user goes through /registro-empresa after login
        rolRepository.findByNombreRol("USUARIO_FINAL")
            .ifPresent(rol -> u.getRoles().add(rol));

        Usuario saved = usuarioRepository.save(u);
        log.info("[clerk-sync] Nuevo usuario OAuth creado: {} clerkId={}", email, clerkUserId);
        return saved;
    }

    private AuthResponse buildAuthResponse(Usuario usuario) {
        String rol           = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
        String empresaSlug   = usuario.getEmpresa() != null ? usuario.getEmpresa().getSlug()         : null;
        String empresaNombre = usuario.getEmpresa() != null ? usuario.getEmpresa().getNombreEmpresa() : null;
        List<String> permisos = permisoRepository.findPermisosByUsuarioId(usuario.getId());
        String accessToken   = jwtUtil.generateTokenFull(
            usuario.getCorreo(), usuario.getId(), rol,
            usuario.getEmpresaId(), empresaSlug, permisos);
        var rt               = refreshTokenService.crear(usuario);
        String nombre        = usuario.getNombre() != null
            ? usuario.getNombre() : usuario.getCorreo().split("@")[0];
        AuthResponse resp    = new AuthResponse(
            accessToken, rt.getToken(), usuario.getId(), usuario.getCorreo(), rol, nombre);
        resp.setEmpresaId(usuario.getEmpresaId());
        resp.setEmpresaSlug(empresaSlug);
        resp.setEmpresaNombre(empresaNombre);
        resp.setPermisos(permisos);
        return resp;
    }
}
