package com.hotclick.agente.asesor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.MotivoFin;
import com.hotclick.agente.motor.MotorAgente;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoAgente;
import com.hotclick.agente.motor.TurnoConversacion;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.service.VectorSearchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Asesor web con acciones (AG-28). Enruta al {@link MotorAgente} con el perfil {@code ASESOR_WEB} los turnos del
 * chat público que piden una acción (ver {@link AsesorIntencion}); el resto sigue por el pipeline de
 * descubrimiento, que conserva fichas de producto, memoria y opciones.
 *
 * <p>Se ejecuta DESPUÉS de la moderación, {@code ChatLegalGuard}, el límite por IP y {@code AsistenteCuotaDiaria}
 * del controlador, así que no las evita. Modo de fallo: si el motor no completa (Claude caído, tope de iteraciones,
 * refusal…) devuelve vacío y el chat sigue por el flujo de siempre; nunca se muestra "te paso con una persona"
 * porque en la web no hay bandeja. Las acciones llegan al navegador como datos y las aplica el frontend.
 */
@Service
public class AsesorWebService {

    private static final Logger log = LoggerFactory.getLogger(AsesorWebService.class);
    static final int MAX_TURNOS = 10;

    /** @param productos productos validados de las acciones AGREGAR_CARRITO (para que el front muestre qué agrega). */
    public record Respuesta(String texto, List<Map<String, Object>> acciones, List<ProductoContexto> productos) {}

    private final MotorAgente motor;
    private final VectorSearchService busqueda;
    private final ObjectMapper mapper;

    public AsesorWebService(MotorAgente motor, VectorSearchService busqueda, ObjectMapper mapper) {
        this.motor = motor;
        this.busqueda = busqueda;
        this.mapper = mapper;
    }

    /**
     * @param empresaId  tienda del chat (en marketplace se ignora: el alcance es todo el catálogo público)
     * @param usuarioId  usuario autenticado resuelto por el controlador; null si es anónimo
     * @param productoId producto de la ficha abierta, si hay (dato del servidor para armar la entrada)
     */
    public Optional<Respuesta> responder(Long empresaId, boolean marketplace, String nombreNegocio, String mensaje,
                                         List<Map<String, Object>> history, Long productoId, Long usuarioId) {
        ContextoHerramienta ctx = new ContextoHerramienta(marketplace ? null : empresaId, null,
            PerfilAgente.ASESOR_WEB, nombreNegocio, null, null, usuarioId);
        String entrada = productoId != null && productoId > 0
            ? "[La persona está viendo el producto con id " + productoId + "] " + mensaje : mensaje;
        ResultadoAgente r;
        try {
            r = motor.ejecutar(PerfilAgente.ASESOR_WEB, ctx, turnos(history), entrada);
        } catch (RuntimeException e) {
            log.warn("[asesor] empresa={} falló el motor: {}", empresaId, e.getClass().getSimpleName());
            return Optional.empty();
        }
        if (r.motivoFin() != MotivoFin.COMPLETO || r.texto().isBlank()) return Optional.empty();

        List<Map<String, Object>> acciones = new ArrayList<>();
        List<ProductoContexto> productos = new ArrayList<>();
        for (AccionAgente a : r.acciones()) {
            if (a.tipo() == AccionAgente.Tipo.AGREGAR_CARRITO) {
                aAccionCarrito(a, ctx, productos).ifPresent(acciones::add);
            } else if (a.tipo() == AccionAgente.Tipo.CHAT_TIENDA) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("tipo", "whatsapp");
                m.put("label", "Chat de la tienda");
                m.put("url", a.dato());
                acciones.add(m);
            }
        }
        return Optional.of(new Respuesta(r.texto(), List.copyOf(acciones), List.copyOf(productos)));
    }

    /** Emite la respuesta por SSE (products, delta, done con acciones). @return false si hay que seguir el flujo normal. */
    public boolean tryHandle(Long empresaId, boolean marketplace, String nombreNegocio, String mensaje,
                             List<Map<String, Object>> history, Long productoId, Long usuarioId, SseEmitter emitter) {
        if (!AsesorIntencion.detecta(mensaje)) return false;
        Optional<Respuesta> r = responder(empresaId, marketplace, nombreNegocio, mensaje, history, productoId, usuarioId);
        if (r.isEmpty()) return false;
        try {
            Respuesta resp = r.get();
            emitter.send(SseEmitter.event().name("products").data(mapper.writeValueAsString(
                Map.of("productos", resp.productos(), "hasMore", false, "query", mensaje))));
            emitter.send(SseEmitter.event().name("delta").data(mapper.writeValueAsString(Map.of("text", resp.texto()))));
            emitter.send(SseEmitter.event().name("done").data(mapper.writeValueAsString(
                Map.of("opts", List.of(), "acciones", resp.acciones()))));
            emitter.complete();
            return true;
        } catch (Exception e) {
            log.debug("[asesor] SSE: {}", e.getClass().getSimpleName());
            return true; // ya se intentó responder; no duplicar con otro flujo
        }
    }

    private Optional<Map<String, Object>> aAccionCarrito(AccionAgente a, ContextoHerramienta ctx,
                                                         List<ProductoContexto> productos) {
        try {
            JsonNode n = mapper.readTree(a.dato());
            long id = n.path("productoId").asLong();
            int cantidad = n.path("cantidad").asInt(1);
            // Una consulta por acción (como mucho unas pocas por turno), con el mismo gate de visibilidad.
            List<ProductoContexto> p = busqueda.buscarPorId(ctx.esMarketplace() ? null : ctx.empresaId(), id,
                ctx.esMarketplace());
            if (p == null || p.isEmpty()) return Optional.empty();
            productos.add(p.get(0));
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("tipo", "AGREGAR_CARRITO");
            m.put("productoId", id);
            m.put("cantidad", cantidad);
            return Optional.of(m);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private static List<TurnoConversacion> turnos(List<Map<String, Object>> history) {
        List<TurnoConversacion> out = new ArrayList<>();
        if (history == null) return out;
        int desde = Math.max(0, history.size() - MAX_TURNOS);
        for (Map<String, Object> h : history.subList(desde, history.size())) {
            String rol = String.valueOf(h.getOrDefault("rol", "")).toLowerCase(Locale.ROOT);
            String texto = String.valueOf(h.getOrDefault("texto", ""));
            if (texto.isBlank()) continue;
            out.add("user".equals(rol) || "usuario".equals(rol)
                ? TurnoConversacion.usuario(texto) : TurnoConversacion.asistente(texto));
        }
        return out;
    }
}
