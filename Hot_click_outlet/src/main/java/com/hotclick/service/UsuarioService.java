package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Usuario;
import com.hotclick.model.Rol;
import com.hotclick.security.RateLimiter;
import com.hotclick.utils.Constants;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.repository.RolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Lazy
    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private N8nWebhookService n8nWebhookService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private RateLimiter rateLimiter;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Registra un contacto/cliente manual del CRM (rol USUARIO_FINAL) con lo mínimo:
     * nombre y, opcionalmente, teléfono y correo. Lo usan CrmController (panel) y el
     * bot de Telegram (venta rápida con cliente nuevo).
     */
    @Transactional
    public Usuario crearClienteRapido(String nombre, String telefono, String correo, Empresa empresa) {
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El nombre es requerido");
        }
        if (correo != null && !correo.isBlank()
                && usuarioRepository.existsByCorreo(correo.trim().toLowerCase(java.util.Locale.ROOT))) {
            throw new com.hotclick.exception.ClienteCorreoExistenteException();
        }
        String[] partes = nombre.trim().split("\\s+", 2);
        Usuario u = new Usuario();
        u.setNombre(partes[0]);
        u.setApellidoPaterno(partes.length > 1 ? partes[1] : "");
        u.setIdentificacion("CLI-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        u.setCorreo(correo != null && !correo.isBlank()
            ? correo.trim().toLowerCase(java.util.Locale.ROOT)
            : "cliente-" + UUID.randomUUID() + "@sinemail.hotclick.lat");
        u.setContrasenaHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        u.setTelefono(telefono != null && !telefono.isBlank() ? telefono.trim() : "00000000");
        u.setEstado(Constants.ESTADO_ACTIVO);
        u.setIntentosFallidos(0);
        u.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        u.setEmpresaRegistro(empresa);
        rolRepository.findByNombreRol(Constants.ROL_USUARIO_FINAL).ifPresent(rol -> u.getRoles().add(rol));
        return usuarioRepository.save(u);
    }

    @Transactional
    public Usuario registrarUsuario(Usuario usuario) {
        if (usuarioRepository.existsByCorreoAndEstadoNot(usuario.getCorreo(), Constants.ESTADO_ELIMINADO)) {
            throw new IllegalArgumentException("El correo ya está registrado");
        }
        if (usuarioRepository.existsByIdentificacionAndEstadoNot(usuario.getIdentificacion(), Constants.ESTADO_ELIMINADO)) {
            throw new IllegalArgumentException("La identificación ya está registrada");
        }
        Optional<Rol> rolDefault = rolRepository.findByNombreRol(Constants.ROL_USUARIO_FINAL);
        if (rolDefault.isPresent()) {
            usuario.getRoles().add(rolDefault.get());
        }
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        usuario.setIntentosFallidos(0);
        Usuario saved = usuarioRepository.save(usuario);
        n8nWebhookService.notificarUsuarioRegistrado(saved.getNombre(), saved.getCorreo(), saved.getTelefono());
        return saved;
    }

    public Optional<Usuario> buscarPorCorreo(String correo) {
        return usuarioRepository.findByCorreo(correo);
    }

    public boolean existeCorreo(String correo) {
        return usuarioRepository.existsByCorreo(correo);
    }

    public boolean existeIdentificacion(String identificacion) {
        return usuarioRepository.existsByIdentificacion(identificacion);
    }

    public Optional<Usuario> buscarPorId(Long id) {
        return usuarioRepository.findById(id);
    }

    @Transactional
    public void actualizarUltimoAcceso(Long id) {
        usuarioRepository.updateUltimoAcceso(id, LocalDateTime.now(Constants.ZONA_CR));
    }

    // ── Bloqueo por fallos de autenticación ───────────────────────────────────
    //
    // Diseño: quien conoce el correo (o la contraseña) no debe poder dejar fuera al dueño.
    //  1) Tope POR USUARIO + IP: tras {ip-max} fallos desde una IP, esa IP queda bloqueada para ese usuario durante
    //     {ip-window} s. El dueño, desde otra IP, no se entera.
    //  2) Tope GLOBAL por usuario (defensa contra ataques repartidos en muchas IP): {global-max} fallos dentro de
    //     {global-window} s bloquean la cuenta de forma TEMPORAL (bloqueadoHasta = ahora + global-window) y avisan al
    //     dueño por correo. Una sola IP no puede llegar a este tope porque el tope por IP la corta antes.
    // Los dos topes viven en hot_click_rate_limit_tb (ventana fija, se limpian solos) y salen de aquí para que
    // login, 2FA verify y los endpoints de gestión 2FA cuenten igual.

    @Value("${hotclick.auth.lockout.ip-max:5}")           private int lockoutIpMax = 5;
    @Value("${hotclick.auth.lockout.ip-window:1800}")     private int lockoutIpWindow = 1800;
    @Value("${hotclick.auth.lockout.global-max:20}")      private int lockoutGlobalMax = 20;
    @Value("${hotclick.auth.lockout.global-window:1800}") private int lockoutGlobalWindow = 1800;

    private static String claveFallosIp(Long id, String ip) {
        return com.hotclick.security.ClavesFallos.claveIp(id, ip);
    }

    private static String claveFallosGlobal(Long id) {
        return com.hotclick.security.ClavesFallos.claveGlobal(id);
    }

    /** true si esta IP agotó sus fallos contra este usuario (se rechaza antes de mirar la contraseña o el código). */
    public boolean ipBloqueadaParaUsuario(Long id, String ip) {
        return rateLimiter.alcanzoLimite(claveFallosIp(id, ip), lockoutIpMax, lockoutIpWindow);
    }

    /**
     * Cuenta un fallo de credencial (contraseña, código TOTP/OTP/recuperación) contra el usuario desde {@code ip}.
     * Aplica el tope por IP y, si se repartió en muchas IP, el bloqueo temporal global.
     */
    @Transactional
    public void registrarFalloAutenticacion(Long id, String ip) {
        rateLimiter.registrar(claveFallosIp(id, ip), lockoutIpWindow);
        usuarioRepository.incrementarIntentosFallidos(id);
        int global = rateLimiter.registrar(claveFallosGlobal(id), lockoutGlobalWindow);
        if (global >= lockoutGlobalMax && global > 0) {
            usuarioRepository.bloquearUsuario(id,
                LocalDateTime.now(Constants.ZONA_CR).plusSeconds(lockoutGlobalWindow));
            if (global == lockoutGlobalMax) {
                usuarioRepository.findById(id).ifPresent(u ->
                    eventPublisher.publishEvent(new CuentaBloqueadaEvent(this, u.getCorreo())));
            }
        }
    }

    /** Autenticación completa: el usuario llegó bien desde {@code ip}; los tropiezos previos de esa IP ya no cuentan. */
    @Transactional
    public void resetearIntentosFallidos(Long id, String ip) {
        resetearIntentosFallidos(id);
        liberarFallosIp(id, ip);
    }

    public void liberarFallosIp(Long id, String ip) {
        rateLimiter.liberar(claveFallosIp(id, ip));
    }

    @Transactional
    public void resetearIntentosFallidos(Long id) {
        usuarioRepository.resetearIntentosFallidos(id);
        rateLimiter.liberar(claveFallosGlobal(id));
    }

    @Transactional
    public Usuario guardar(Usuario usuario) {
        return usuarioRepository.save(usuario);
    }

    /**
     * Tumba cualquier access token JWT ya emitido para este usuario, aunque no haya
     * expirado — ver JwtRequestFilter.fueInvalidadoPorCambioDeSesion(). Llamar siempre
     * junto a un cambio o reset de contraseña.
     */
    @Transactional
    public void invalidarSesiones(Usuario usuario) {
        usuario.setSesionesInvalidadasEn(LocalDateTime.now(Constants.ZONA_CR));
        usuarioRepository.save(usuario);
    }

    /** Registro sin email: guarda con estado PENDIENTE, sin rol asignado. */
    @Transactional
    public Usuario registrarSolicitud(Usuario usuario) {
        if (usuarioRepository.existsByCorreoAndEstadoNot(usuario.getCorreo(), Constants.ESTADO_ELIMINADO)) {
            throw new IllegalArgumentException("El correo ya está registrado");
        }
        if (usuarioRepository.existsByIdentificacionAndEstadoNot(usuario.getIdentificacion(), Constants.ESTADO_ELIMINADO)) {
            throw new IllegalArgumentException("La identificación ya está registrada");
        }
        usuario.setId(null);
        usuario.getRoles().clear();
        usuario.setBloqueadoHasta(null);
        usuario.setEstado(Constants.ESTADO_PENDIENTE);
        usuario.setIntentosFallidos(0);
        Usuario guardado = usuarioRepository.save(usuario);
        com.hotclick.security.ClavesFallos.liberarTodo(rateLimiter, usuario.getId()); // cuenta nueva: sin fallos heredados
        return guardado;
    }

    /**
     * Crea la cuenta como PENDIENTE (estado 5) antes de verificar el correo.
     * El OTP se emite después de llamar a este método.
     */
    @Transactional
    public Usuario registrarPendiente(Usuario usuario) {
        if (usuarioRepository.existsByCorreoAndEstadoNot(usuario.getCorreo().trim(), Constants.ESTADO_ELIMINADO)) {
            throw new IllegalArgumentException("El correo ya está registrado");
        }
        if (usuario.getIdentificacion() != null && !usuario.getIdentificacion().isBlank()
                && usuarioRepository.existsByIdentificacionAndEstadoNot(usuario.getIdentificacion().trim(), Constants.ESTADO_ELIMINADO)) {
            throw new IllegalArgumentException("La identificación ya está registrada");
        }
        Optional<Rol> rolDefault = rolRepository.findByNombreRol(Constants.ROL_USUARIO_FINAL);
        usuario.setId(null);
        usuario.getRoles().clear();
        usuario.setBloqueadoHasta(null);
        rolDefault.ifPresent(rol -> usuario.getRoles().add(rol));
        usuario.setEstado(Constants.ESTADO_PENDIENTE);
        usuario.setIntentosFallidos(0);
        usuario.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        Usuario guardado = usuarioRepository.save(usuario);
        com.hotclick.security.ClavesFallos.liberarTodo(rateLimiter, usuario.getId()); // cuenta nueva: sin fallos heredados
        return guardado;
    }

    /** Activa la cuenta tras verificación exitosa del OTP de registro. */
    @Transactional
    public void activarUsuario(Long id) {
        usuarioRepository.findById(id).ifPresent(u -> {
            u.setEstado(Constants.ESTADO_ACTIVO);
            usuarioRepository.save(u);
        });
    }
}
