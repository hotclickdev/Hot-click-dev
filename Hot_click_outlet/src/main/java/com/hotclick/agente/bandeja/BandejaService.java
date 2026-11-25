package com.hotclick.agente.bandeja;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionMensajeRepository;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.conversacion.EstadoConversacion;
import com.hotclick.agente.conversacion.ModoConversacion;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Bandeja de conversaciones (AG-16). Aislamiento: {@code empresaScope} es la empresa del llamador, o null solo para
 * el ADMIN de plataforma, que ve únicamente las conversaciones del bot de HotClick (empresa null) y nunca las de un
 * negocio. Una conversación fuera de alcance responde como inexistente (404).
 */
@Service
public class BandejaService {

    static final Duration VENTANA = BandejaMapeo.VENTANA;
    static final int MAX_TEXTO = 1000;
    static final int MAX_PAGINA = 50;
    static final String MSG_VENTANA = "Pasaron más de 24 horas desde el último mensaje de la persona. "
        + "El canal ya no permite escribirle desde acá; esperá a que ella escriba de nuevo.";

    public enum Vista { TODAS, SIN_ASIGNAR, MIAS }

    private final ConversacionSesionRepository sesiones;
    private final ConversacionMensajeRepository mensajes;
    private final ConversacionService conversaciones;
    private final CanalCuentaRepository cuentas;
    private final CanalMensajeria canal;
    private final MiembroEmpresaRepository miembros;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public BandejaService(ConversacionSesionRepository sesiones, ConversacionMensajeRepository mensajes,
                          ConversacionService conversaciones, CanalCuentaRepository cuentas, CanalMensajeria canal,
                          MiembroEmpresaRepository miembros) {
        this(sesiones, mensajes, conversaciones, cuentas, canal, miembros, Clock.systemUTC());
    }

    BandejaService(ConversacionSesionRepository sesiones, ConversacionMensajeRepository mensajes,
                   ConversacionService conversaciones, CanalCuentaRepository cuentas, CanalMensajeria canal,
                   MiembroEmpresaRepository miembros, Clock clock) {
        this.sesiones = sesiones;
        this.mensajes = mensajes;
        this.conversaciones = conversaciones;
        this.cuentas = cuentas;
        this.canal = canal;
        this.miembros = miembros;
        this.clock = clock;
    }

    // ── Lectura ────────────────────────────────────────────────────────────────

    public BandejaDtos.Pagina listar(Long scope, Long usuarioId, Vista vista, String canalFiltro,
                                     EstadoConversacion estado, int pagina, int tamano) {
        int size = Math.max(1, Math.min(tamano, MAX_PAGINA));
        Pageable pageable = PageRequest.of(Math.max(0, pagina), size, Sort.by(Sort.Direction.DESC, "ultimoMensajeEn"));
        Page<ConversacionSesion> p = sesiones.findAll(filtro(scope, usuarioId, vista, canalFiltro, estado), pageable);

        List<UUID> ids = BandejaMapeo.ids(p.getContent());
        // Una sola consulta para las vistas previas de toda la página (sin consulta por conversación).
        Map<UUID, String> previas = ids.isEmpty() ? Map.of() : BandejaMapeo.previas(mensajes.ultimosDe(ids));
        return BandejaMapeo.pagina(p, usuarioId, previas, clock.instant());
    }

    /**
     * AG-38: chats cerrados cuya encuesta de satisfacción quedó con nota baja (1 o 2), del más reciente al más viejo.
     * Mismo alcance que la bandeja: un negocio solo ve los suyos; el ADMIN, los del bot de HotClick.
     */
    public BandejaDtos.Pagina listarNotaBaja(Long scope, Long usuarioId, String canalFiltro, int pagina, int tamano) {
        int size = Math.max(1, Math.min(tamano, MAX_PAGINA));
        Pageable pageable = PageRequest.of(Math.max(0, pagina), size, Sort.by(Sort.Direction.DESC, "ultimoMensajeEn"));
        Page<ConversacionSesion> p = sesiones.findAll(filtroNotaBaja(scope, canalFiltro), pageable);
        List<UUID> ids = BandejaMapeo.ids(p.getContent());
        Map<UUID, String> previas = ids.isEmpty() ? Map.of() : BandejaMapeo.previas(mensajes.ultimosDe(ids));
        return BandejaMapeo.pagina(p, usuarioId, previas, clock.instant());
    }

    public BandejaDtos.Resumen resumen(Long scope, Long usuarioId) {
        long mias = sesiones.count(filtro(scope, usuarioId, Vista.MIAS, null, EstadoConversacion.ABIERTA));
        long sin = sesiones.count(filtro(scope, usuarioId, Vista.SIN_ASIGNAR, null, EstadoConversacion.ABIERTA));
        return new BandejaDtos.Resumen(mias, sin);
    }

    public BandejaDtos.Detalle detalle(UUID id, Long scope, Long usuarioId) {
        ConversacionSesion s = cargar(id, scope);
        List<ConversacionMensaje> ms = new ArrayList<>(mensajes.findTop200BySesionIdOrderByIdDesc(s.getId()));
        Collections.reverse(ms);
        String previa = ms.isEmpty() ? null : BandejaMapeo.recortar(ms.get(ms.size() - 1).getContenido());
        return new BandejaDtos.Detalle(aDto(s, usuarioId, previa, clock.instant()), BandejaMapeo.turnos(ms));
    }

    /**
     * Últimos turnos (cronológicos) de una conversación dentro del alcance, para el resumen con IA (AG-17).
     * Misma verificación de empresa que el resto: fuera de alcance responde como inexistente (404).
     */
    public List<ConversacionMensaje> mensajesParaResumen(UUID id, Long scope) {
        ConversacionSesion s = cargar(id, scope);
        List<ConversacionMensaje> ms = new ArrayList<>(mensajes.findTop20BySesionIdOrderByIdDesc(s.getId()));
        Collections.reverse(ms);
        return ms;
    }

    /** Personas a quienes se puede asignar: el equipo activo del negocio (y quien llama). */
    public List<BandejaDtos.Miembro> equipo(Long scope, Usuario actual) {
        List<MiembroEmpresa> activos = scope == null ? List.of() : miembros.findByEmpresaIdAndEstado(scope, 1);
        return BandejaMapeo.equipo(activos, actual);
    }

    // ── Acciones ───────────────────────────────────────────────────────────────

    public BandejaDtos.Conversacion pausar(UUID id, Long scope, Long usuarioId) {
        cargar(id, scope);
        return aDto(conversaciones.pausarBot(id, scope), usuarioId, null, clock.instant());
    }

    public BandejaDtos.Conversacion reanudar(UUID id, Long scope, Long usuarioId) {
        cargar(id, scope);
        return aDto(conversaciones.reanudarBot(id, scope), usuarioId, null, clock.instant());
    }

    public BandejaDtos.Conversacion tomar(UUID id, Long scope, Long usuarioId) {
        cargar(id, scope);
        return aDto(conversaciones.tomar(id, scope, usuarioId), usuarioId, null, clock.instant());
    }

    public BandejaDtos.Conversacion asignar(UUID id, Long scope, Long actorId, Long destinoId) {
        cargar(id, scope);
        return aDto(conversaciones.asignar(id, scope, destinoId), actorId, null, clock.instant());
    }

    public BandejaDtos.Conversacion cerrar(UUID id, Long scope, Long usuarioId) {
        cargar(id, scope);
        return aDto(conversaciones.cerrar(id, scope), usuarioId, null, clock.instant());
    }

    /**
     * Envía por el canal de la conversación y guarda el turno 'persona'. Sin transacción envolvente: no se espera
     * a Meta con una conexión de base de datos abierta.
     */
    public BandejaDtos.Mensaje responder(UUID id, Long scope, String texto) {
        String limpio = texto == null ? "" : texto.trim();
        if (limpio.isEmpty()) throw new IllegalArgumentException("Escribí un mensaje antes de enviar");
        if (limpio.length() > MAX_TEXTO) {
            throw new IllegalArgumentException("El mensaje es muy largo (máximo " + MAX_TEXTO + " caracteres)");
        }
        ConversacionSesion s = cargar(id, scope);
        if (s.getEstado() == EstadoConversacion.CERRADA) {
            throw new BandejaConflictoException("La conversación está cerrada");
        }
        if (!ventanaAbierta(s, clock.instant())) throw new BandejaConflictoException(MSG_VENTANA);
        CanalCuenta cuenta = cuentas.findById(s.getCanalCuentaId())
            .filter(c -> Objects.equals(c.getEmpresaId(), s.getEmpresaId()))
            .orElseThrow(() -> new RecursoNoEncontradoException("Conversación no encontrada"));
        if (cuenta.getEstado() != EstadoCanal.ACTIVA) {
            throw new BandejaConflictoException("El canal está pausado o desconectado. Reactivalo para poder responder.");
        }
        try {
            canal.enviarTexto(cuenta, s.getContactoExterno(), limpio);
        } catch (IllegalStateException e) {
            throw new BandejaConflictoException("El canal no está disponible para responder en este momento");
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            throw new BandejaRechazoCanalException(e.getStatusCode().value());
        }
        Instant ahora = clock.instant();
        ConversacionMensaje m = new ConversacionMensaje();
        m.setSesionId(s.getId());
        m.setEmpresaId(s.getEmpresaId());
        m.setRol(ConversacionMensaje.ROL_PERSONA);
        m.setContenido(limpio);
        m.setFechaCreacion(ahora);
        m = mensajes.save(m);
        s.setModo(ModoConversacion.PERSONA);
        s.setUltimoMensajeEn(ahora);
        sesiones.save(s);
        return BandejaMapeo.mensaje(m);
    }

    // ── Internos ───────────────────────────────────────────────────────────────

    /** Carga dentro del alcance: el ADMIN solo alcanza las de HotClick (empresa null); si no, 404. */
    ConversacionSesion cargar(UUID id, Long scope) {
        ConversacionSesion s = id == null ? null : sesiones.findById(id).orElse(null);
        if (s == null || s.getCanalCuentaId() == null || s.getPerfil() == PerfilConversacion.NEGOCIO_INTERNO
                || !Objects.equals(scope, s.getEmpresaId())) {
            throw new RecursoNoEncontradoException("Conversación no encontrada");
        }
        return s;
    }

    private static Specification<ConversacionSesion> filtro(Long scope, Long usuarioId, Vista vista,
                                                            String canalFiltro, EstadoConversacion estado) {
        return (root, q, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            ps.add(cb.isNotNull(root.get("canalCuentaId")));
            ps.add(cb.or(cb.isNull(root.get("perfil")),
                cb.notEqual(root.get("perfil"), PerfilConversacion.NEGOCIO_INTERNO)));
            ps.add(scope == null ? cb.isNull(root.get("empresaId")) : cb.equal(root.get("empresaId"), scope));
            ps.add(cb.equal(root.get("estado"), estado == null ? EstadoConversacion.ABIERTA : estado));
            if (canalFiltro != null && !canalFiltro.isBlank()) {
                ps.add(cb.equal(root.get("canal"), canalFiltro.trim().toUpperCase(Locale.ROOT)));
            }
            if (vista == Vista.SIN_ASIGNAR) ps.add(cb.isNull(root.get("usuarioAsignadoId")));
            if (vista == Vista.MIAS) ps.add(cb.equal(root.get("usuarioAsignadoId"), usuarioId));
            return cb.and(ps.toArray(new Predicate[0]));
        };
    }

    private static Specification<ConversacionSesion> filtroNotaBaja(Long scope, String canalFiltro) {
        return (root, q, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            ps.add(cb.isNotNull(root.get("canalCuentaId")));
            ps.add(cb.or(cb.isNull(root.get("perfil")),
                cb.notEqual(root.get("perfil"), PerfilConversacion.NEGOCIO_INTERNO)));
            ps.add(scope == null ? cb.isNull(root.get("empresaId")) : cb.equal(root.get("empresaId"), scope));
            ps.add(cb.isNotNull(root.get("encuestaNota")));
            ps.add(cb.le(root.<Integer>get("encuestaNota"), com.hotclick.agente.metricas.EncuestaService.NOTA_BAJA_MAX));
            if (canalFiltro != null && !canalFiltro.isBlank()) {
                ps.add(cb.equal(root.get("canal"), canalFiltro.trim().toUpperCase(Locale.ROOT)));
            }
            return cb.and(ps.toArray(new Predicate[0]));
        };
    }

    static boolean ventanaAbierta(ConversacionSesion s, Instant ahora) {
        return BandejaMapeo.ventanaAbierta(s, ahora);
    }

    private static BandejaDtos.Conversacion aDto(ConversacionSesion s, Long usuarioId, String previa, Instant ahora) {
        return BandejaMapeo.conversacion(s, usuarioId, previa, ahora);
    }
}
