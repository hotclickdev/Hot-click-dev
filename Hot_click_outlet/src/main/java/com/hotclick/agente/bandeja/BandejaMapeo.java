package com.hotclick.agente.bandeja;

import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import org.springframework.data.domain.Page;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Conversión de entidades a las vistas públicas de la bandeja. No toca la base de datos. */
final class BandejaMapeo {

    static final Duration VENTANA = Duration.ofHours(24);
    static final int MAX_VISTA_PREVIA = 80;

    private BandejaMapeo() {}

    static List<UUID> ids(List<ConversacionSesion> pagina) {
        return pagina.stream().map(ConversacionSesion::getId).toList();
    }

    static boolean ventanaAbierta(ConversacionSesion s, Instant ahora) {
        Instant ultimo = s.getUltimoMensajeCliente();
        return ultimo != null && ultimo.plus(VENTANA).isAfter(ahora);
    }

    static BandejaDtos.Conversacion conversacion(ConversacionSesion s, Long usuarioId, String previa, Instant ahora) {
        Instant vence = s.getUltimoMensajeCliente() == null ? null : s.getUltimoMensajeCliente().plus(VENTANA);
        return new BandejaDtos.Conversacion(s.getId(), s.getCanal(),
            RecursoNoEncontradoException.enmascarar(s.getContactoExterno()), s.getModo().name(), s.getEstado().name(),
            s.getUsuarioAsignadoId(),
            s.getUsuarioAsignadoId() != null && s.getUsuarioAsignadoId().equals(usuarioId),
            previa, s.getUltimoMensajeEn(), ventanaAbierta(s, ahora), vence, s.isCupoAgotado(), s.getEncuestaNota());
    }

    /** Vista previa por conversación a partir del último turno de cada una. */
    static Map<UUID, String> previas(List<ConversacionMensaje> ultimos) {
        return ultimos.stream()
            .collect(Collectors.toMap(ConversacionMensaje::getSesionId, m -> recortar(m.getContenido()), (a, b) -> a));
    }

    static BandejaDtos.Pagina pagina(Page<ConversacionSesion> p, Long usuarioId, Map<UUID, String> previas, Instant ahora) {
        List<BandejaDtos.Conversacion> items = p.getContent().stream()
            .map(s -> conversacion(s, usuarioId, previas.get(s.getId()), ahora)).toList();
        return new BandejaDtos.Pagina(items, p.getNumber(), p.getSize(), p.getTotalElements(), p.hasNext());
    }

    static BandejaDtos.Mensaje mensaje(ConversacionMensaje m) {
        return new BandejaDtos.Mensaje(m.getId(), m.getRol(), m.getContenido(), m.getFechaCreacion());
    }

    static List<BandejaDtos.Mensaje> turnos(List<ConversacionMensaje> ordenados) {
        return ordenados.stream().map(BandejaMapeo::mensaje).toList();
    }

    /** Miembros activos del negocio más quien llama, sin repetidos y por nombre. */
    static List<BandejaDtos.Miembro> equipo(List<MiembroEmpresa> miembros, Usuario actual) {
        Map<Long, BandejaDtos.Miembro> r = new LinkedHashMap<>();
        miembros.stream().map(MiembroEmpresa::getUsuario)
            .forEach(u -> r.put(u.getId(), new BandejaDtos.Miembro(u.getId(), nombreDe(u))));
        if (actual != null) r.putIfAbsent(actual.getId(), new BandejaDtos.Miembro(actual.getId(), nombreDe(actual)));
        return r.values().stream().sorted((a, b) -> a.nombre().compareToIgnoreCase(b.nombre())).toList();
    }

    static String recortar(String t) {
        if (t == null) return "";
        String x = t.replaceAll("\\s+", " ").trim();
        return x.length() <= MAX_VISTA_PREVIA ? x : x.substring(0, MAX_VISTA_PREVIA - 1) + "…";
    }

    static String nombreDe(Usuario u) {
        String n = u.getNombre() == null ? "" : u.getNombre().trim();
        String a = u.getApellidoPaterno() == null ? "" : u.getApellidoPaterno().trim();
        String r = (n + " " + a).trim();
        return r.isEmpty() ? "Usuario " + u.getId() : r;
    }
}
