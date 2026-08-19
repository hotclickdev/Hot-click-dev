package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class ClerkSyncService {

    private static final Logger log = LoggerFactory.getLogger(ClerkSyncService.class);

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository rolRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AuthSupport authSupport;

    public AuthResponse sync(String clerkUserId, String email, boolean emailVinoEnJwt,
                             String nombre, String apellido, String fotoUrl) {
        if (!emailVinoEnJwt) {
            log.warn("[clerk-sync] JWT sin claim 'email' — usando email del body (configura el JWT template). clerkUserId={}", clerkUserId);
        }
        Usuario usuario = resolveUser(clerkUserId, email, nombre, apellido, fotoUrl);
        usuarioRepository.updateUltimoAcceso(usuario.getId(), LocalDateTime.now(Constants.ZONA_CR));
        usuario = usuarioRepository.findByCorreo(usuario.getCorreo())
            .orElseThrow(() -> new IllegalStateException("Error al cargar usuario tras sync"));
        AuthResponse resp = authSupport.buildAuthResponse(usuario);
        log.info("[clerk-sync] Login social exitoso: {} ({})", email, clerkUserId);
        return resp;
    }

    private Usuario resolveUser(String clerkUserId, String email,
                                 String nombre, String apellido, String fotoUrl) {
        Optional<Usuario> byClerk = usuarioRepository.findByClerkUserId(clerkUserId);
        if (byClerk.isPresent()) {
            return byClerk.get();
        }
        Optional<Usuario> byEmail = usuarioRepository.findByCorreo(email);
        if (byEmail.isPresent()) {
            return vincularCuentaExistente(byEmail.get(), clerkUserId, email, fotoUrl);
        }
        return createOAuthUser(clerkUserId, email, nombre, apellido, fotoUrl);
    }

    private Usuario vincularCuentaExistente(Usuario u, String clerkUserId, String email, String fotoUrl) {
        boolean hasElevatedRole = u.getRoles().stream()
            .map(Rol::getNombreRol)
            .anyMatch(r -> Constants.ROL_ADMIN.equals(r) || Constants.ROL_EMPRENDEDOR.equals(r));
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

    private Usuario createOAuthUser(String clerkUserId, String email,
                                     String nombre, String apellido, String fotoUrl) {
        Usuario u = new Usuario();
        u.setClerkUserId(clerkUserId);
        u.setCorreo(email);
        u.setNombre(nombre.isBlank() ? email.split("@")[0] : nombre);
        u.setApellidoPaterno(apellido.isBlank() ? "-" : apellido);
        u.setTelefono("");
        u.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        u.setEstado(1);
        if (!fotoUrl.isBlank()) {
            u.setFotoPerfilUrl(fotoUrl);
        }
        u.setContrasenaHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        String raw = clerkUserId.startsWith("user_") ? clerkUserId.substring(5) : clerkUserId;
        String identificacion = ("CL" + raw).substring(0, Math.min(20, ("CL" + raw).length()));
        u.setIdentificacion(identificacion);
        rolRepository.findByNombreRol("USUARIO_FINAL")
            .ifPresent(rol -> u.getRoles().add(rol));
        Usuario saved = usuarioRepository.save(u);
        log.info("[clerk-sync] Nuevo usuario OAuth creado: {} clerkId={}", email, clerkUserId);
        return saved;
    }
}
