package com.hotclick.agente.conversacion;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Conversaciones de los bots y su bandeja. La API REST de la bandeja es AG-16; aquí solo el servicio.
 *
 * <p>Aislamiento: las operaciones de bandeja reciben {@code empresaScope} (id de empresa del llamador, o null solo
 * para el ADMIN global). Una conversación de otra empresa responde como inexistente (404) y un usuario que no es
 * del equipo del negocio no se puede asignar.
 */
@Service
public class ConversacionService {

    private final ConversacionSesionRepository sesiones;
    private final ConversacionMensajeRepository mensajes;
    private final UsuarioRepository usuarios;
    private final SelectorPerfil selector;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public ConversacionService(ConversacionSesionRepository sesiones, ConversacionMensajeRepository mensajes,
                               UsuarioRepository usuarios, SelectorPerfil selector) {
        this(sesiones, mensajes, usuarios, selector, Clock.systemUTC());
    }

    ConversacionService(ConversacionSesionRepository sesiones, ConversacionMensajeRepository mensajes,
                        UsuarioRepository usuarios, SelectorPerfil selector, Clock clock) {
        this.sesiones = sesiones;
        this.mensajes = mensajes;
        this.usuarios = usuarios;
        this.selector = selector;
        this.clock = clock;
    }

    /**
     * Obtiene o crea la conversación abierta de (cuenta, contacto), guarda el mensaje entrante y marca el último
     * mensaje del cliente (ventana de 24 h). Puede lanzar DataIntegrityViolationException si dos mensajes del mismo
     * contacto crean la conversación a la vez: quien llama reintenta una vez.
     */
    @Transactional
    public ConversacionActiva registrarEntrante(CanalCuenta cuenta, MensajeEntrante m) {
        Instant ahora = clock.instant();
        SelectorPerfil.Eleccion eleccion = selector.elegir(cuenta, m.remitenteId());

        ConversacionSesion s = sesiones.findFirstByCanalCuentaIdAndContactoExternoAndEstado(
            cuenta.getId(), m.remitenteId(), EstadoConversacion.ABIERTA).orElse(null);
        if (s == null) {
            s = new ConversacionSesion();
            s.setEmpresaId(cuenta.getEmpresaId());
            s.setCanal(cuenta.getTipo().name());
            s.setCanalCuentaId(cuenta.getId());
            s.setContactoExterno(m.remitenteId());
        }
        s.setPerfil(eleccion.perfil());
        s.setUsuarioId(eleccion.usuarioId());
        s.setUltimoMensajeCliente(ahora);
        s.setUltimoMensajeEn(ahora);
        s = sesiones.save(s);

        ConversacionMensaje msg = new ConversacionMensaje();
        msg.setSesionId(s.getId());
        msg.setEmpresaId(s.getEmpresaId());
        msg.setRol(ConversacionMensaje.ROL_CLIENTE);
        msg.setContenido(m.texto() != null && !m.texto().isBlank() ? m.texto() : "[" + m.tipo() + "]");
        msg.setFechaCreacion(ahora);
        mensajes.save(msg);

        // Una sola consulta (20 filas); la conversión a turnos vive fuera de este servicio.
        List<ConversacionActiva.Turno> historial = ConversacionActiva.turnosDe(
            mensajes.findTop20BySesionIdOrderByIdDesc(s.getId()));

        return new ConversacionActiva(s.getId(), s.getPerfil(), s.getEmpresaId(), cuenta, s.getContactoExterno(),
            s.getUsuarioId(), s.getModo(), s.getUltimoMensajeCliente(), historial);
    }

    /** Pausa el bot: a partir de ahora el enrutador no lo invoca. */
    @Transactional
    public ConversacionSesion pausarBot(UUID sesionId, Long empresaScope) {
        ConversacionSesion s = deAlcance(sesionId, empresaScope);
        s.setModo(ModoConversacion.PERSONA);
        return sesiones.save(s);
    }

    /** Devuelve la conversación al bot y la libera de quien la tenía. */
    @Transactional
    public ConversacionSesion reanudarBot(UUID sesionId, Long empresaScope) {
        ConversacionSesion s = deAlcance(sesionId, empresaScope);
        s.setModo(ModoConversacion.BOT);
        s.setUsuarioAsignadoId(null);
        return sesiones.save(s);
    }

    /** Una persona toma el chat: bot pausado y asignado a ella (debe ser del mismo negocio). */
    @Transactional
    public ConversacionSesion tomar(UUID sesionId, Long empresaScope, Long usuarioId) {
        return asignar(sesionId, empresaScope, usuarioId);
    }

    /** Asigna a un usuario del mismo negocio y deja la conversación en modo PERSONA. */
    @Transactional
    public ConversacionSesion asignar(UUID sesionId, Long empresaScope, Long usuarioDestinoId) {
        ConversacionSesion s = deAlcance(sesionId, empresaScope);
        if (usuarioDestinoId == null || !usuarioDelNegocio(s.getEmpresaId(), usuarioDestinoId))
            throw new TenantAccessDeniedException("El usuario no pertenece a este negocio");
        s.setUsuarioAsignadoId(usuarioDestinoId);
        s.setModo(ModoConversacion.PERSONA);
        return sesiones.save(s);
    }

    @Transactional
    public ConversacionSesion cerrar(UUID sesionId, Long empresaScope) {
        ConversacionSesion s = deAlcance(sesionId, empresaScope);
        s.setEstado(EstadoConversacion.CERRADA);
        return sesiones.save(s);
    }

    private boolean usuarioDelNegocio(Long empresaId, Long usuarioId) {
        return empresaId == null ? usuarios.esAdminActivo(usuarioId)
                                 : usuarios.esMiembroActivoDeEmpresa(usuarioId, empresaId);
    }

    private ConversacionSesion deAlcance(UUID id, Long empresaScope) {
        ConversacionSesion s = id == null ? null : sesiones.findById(id).orElse(null);
        if (s == null || s.getCanalCuentaId() == null
                || (empresaScope != null && !empresaScope.equals(s.getEmpresaId())))
            throw new RecursoNoEncontradoException("Conversación no encontrada");
        return s;
    }
}
