package com.hotclick.service;

import com.hotclick.model.Usuario;
import com.hotclick.model.Rol;
import com.hotclick.utils.Constants;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.repository.RolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;

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

    @Transactional
    public Usuario registrarUsuario(Usuario usuario) {
        if (usuarioRepository.existsByCorreoAndEstadoNot(usuario.getCorreo(), Constants.ESTADO_ELIMINADO)) {
            throw new RuntimeException("El correo ya está registrado");
        }
        if (usuarioRepository.existsByIdentificacionAndEstadoNot(usuario.getIdentificacion(), Constants.ESTADO_ELIMINADO)) {
            throw new RuntimeException("La identificación ya está registrada");
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

    @Transactional
    public void incrementarIntentosFallidos(Long id) {
        // Incremento + lectura en la MISMA transacción: el lock de fila de la UPDATE
        // se mantiene hasta el SELECT, así que intentos == 5 (no >= 5) garantiza que
        // solo un hilo concurrente ve el umbral y dispara el evento de bloqueo.
        usuarioRepository.incrementarYBloquear(id);
        int intentos = usuarioRepository.findIntentosFallidos(id).orElse(0);
        if (intentos == 5) {
            usuarioRepository.findById(id).ifPresent(u ->
                eventPublisher.publishEvent(new CuentaBloqueadaEvent(this, u.getCorreo())));
        }
    }

    @Transactional
    public void resetearIntentosFallidos(Long id) {
        usuarioRepository.resetearIntentosFallidos(id);
    }

    @Transactional
    public Usuario guardar(Usuario usuario) {
        return usuarioRepository.save(usuario);
    }

    /** Registro sin email: guarda con estado PENDIENTE, sin rol asignado. */
    @Transactional
    public Usuario registrarSolicitud(Usuario usuario) {
        if (usuarioRepository.existsByCorreoAndEstadoNot(usuario.getCorreo(), Constants.ESTADO_ELIMINADO)) {
            throw new RuntimeException("El correo ya está registrado");
        }
        if (usuarioRepository.existsByIdentificacionAndEstadoNot(usuario.getIdentificacion(), Constants.ESTADO_ELIMINADO)) {
            throw new RuntimeException("La identificación ya está registrada");
        }
        usuario.setId(null);
        usuario.getRoles().clear();
        usuario.setBloqueadoHasta(null);
        usuario.setEstado(Constants.ESTADO_PENDIENTE);
        usuario.setIntentosFallidos(0);
        return usuarioRepository.save(usuario);
    }

    /**
     * Crea la cuenta como PENDIENTE (estado 5) antes de verificar el correo.
     * El OTP se emite después de llamar a este método.
     */
    @Transactional
    public Usuario registrarPendiente(Usuario usuario) {
        if (usuarioRepository.existsByCorreoAndEstadoNot(usuario.getCorreo().trim(), Constants.ESTADO_ELIMINADO)) {
            throw new RuntimeException("El correo ya está registrado");
        }
        if (usuario.getIdentificacion() != null && !usuario.getIdentificacion().isBlank()
                && usuarioRepository.existsByIdentificacionAndEstadoNot(usuario.getIdentificacion().trim(), Constants.ESTADO_ELIMINADO)) {
            throw new RuntimeException("La identificación ya está registrada");
        }
        Optional<Rol> rolDefault = rolRepository.findByNombreRol(Constants.ROL_USUARIO_FINAL);
        usuario.setId(null);
        usuario.getRoles().clear();
        usuario.setBloqueadoHasta(null);
        rolDefault.ifPresent(rol -> usuario.getRoles().add(rol));
        usuario.setEstado(Constants.ESTADO_PENDIENTE);
        usuario.setIntentosFallidos(0);
        usuario.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        return usuarioRepository.save(usuario);
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
