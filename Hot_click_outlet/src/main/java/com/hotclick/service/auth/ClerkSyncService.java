package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.legal.MayoriaEdad;
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

    /** P1-01: la cuenta ya está vinculada a otro usuario de Clerk; nunca se re-vincula. */
    public static class ClerkVinculoConflictoException extends RuntimeException {
        public ClerkVinculoConflictoException(String msg) { super(msg); }
    }

    /**
     * @param email correo VERIFICADO tomado del token de Clerk (nunca del body).
     */
    public AuthResponse sync(String clerkUserId, String email,
                             String nombre, String apellido, String fotoUrl, boolean declaraMayoriaEdad) {
        Usuario usuario = resolveUser(clerkUserId, email, nombre, apellido, fotoUrl, declaraMayoriaEdad);
        authSupport.exigirCuentaActiva(usuario); // antes de tocar ultimoAcceso: una cuenta no activa no entra
        usuarioRepository.updateUltimoAcceso(usuario.getId(), LocalDateTime.now(Constants.ZONA_CR));
        usuario = usuarioRepository.findByCorreo(usuario.getCorreo())
            .orElseThrow(() -> new IllegalStateException("Error al cargar usuario tras sync"));
        AuthResponse resp = authSupport.buildAuthResponse(usuario);
        log.info("[clerk-sync] Login social exitoso: {} ({})", email, clerkUserId);
        return resp;
    }

    private Usuario resolveUser(String clerkUserId, String email,
                                 String nombre, String apellido, String fotoUrl,
                                 boolean declaraMayoriaEdad) {
        Optional<Usuario> byClerk = usuarioRepository.findByClerkUserId(clerkUserId);
        if (byClerk.isPresent()) {
            Usuario u = exigirActiva(byClerk.get());
            if (u.getCorreo() != null && !u.getCorreo().equalsIgnoreCase(email)) {
                log.warn("[clerk-sync] clerkId={} ya vinculado a otra cuenta (id={}); correo del token distinto",
                    clerkUserId, u.getId());
            }
            return u;
        }
        Optional<Usuario> byEmail = usuarioRepository.findByCorreo(email);
        if (byEmail.isPresent()) {
            return vincularCuentaExistente(exigirActiva(byEmail.get()), clerkUserId, email, fotoUrl);
        }
        MayoriaEdad.exigir(declaraMayoriaEdad);
        return createOAuthUser(clerkUserId, email, nombre, apellido, fotoUrl);
    }

    /**
     * Antes de vincular o persistir nada: una cuenta con estado distinto de 1 (eliminada, suspendida, inactiva,
     * pendiente o sin estado) se rechaza con el mensaje genérico, sin distinguir el estado.
     */
    private Usuario exigirActiva(Usuario u) {
        authSupport.exigirCuentaActiva(u);
        return u;
    }

    private Usuario vincularCuentaExistente(Usuario u, String clerkUserId, String email, String fotoUrl) {
        boolean hasElevatedRole = u.getRoles().stream()
            .map(Rol::getNombreRol)
            .anyMatch(r -> Constants.ROL_ADMIN.equals(r) || Constants.ROL_EMPRENDEDOR.equals(r));
        if (u.getClerkUserId() != null && !u.getClerkUserId().equals(clerkUserId)) {
            log.warn("[clerk-sync] P1-01 rechazado: cuenta id={} ya vinculada a otro clerkId; intento con clerkId={}",
                u.getId(), clerkUserId);
            throw new ClerkVinculoConflictoException(
                "Esta cuenta ya está vinculada a otro inicio de sesión social. Ingresá con tu método habitual.");
        }
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
