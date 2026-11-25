package com.hotclick.agente.motor;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.legal.ChatLegalGuard;
import com.hotclick.service.TextModerationService;
import com.hotclick.service.ai.ClaudePrecios;
import com.hotclick.service.ai.ClaudeUsoRegistrador;
import com.hotclick.service.ai.UsoTokens;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Motor de agentes: bucle de {@code tool_use} sobre la Messages API de Claude con perfiles.
 *
 * <p>Diferencias de Claude Haiku 5.5 / Sonnet 5.5 respetadas aquí: sin {@code temperature}/{@code top_p}/
 * {@code budget_tokens}; pensamiento adaptativo por defecto (se controla con {@code output_config.effort});
 * sin prefill (el último mensaje siempre es del usuario); {@code tool_choice} solo {@code auto}; los bloques de
 * la respuesta (incluido {@code thinking}) se devuelven intactos en el turno del asistente; {@code refusal}
 * no tiene fallback de servidor, así que se deriva a una persona. Los inputs de herramientas se validan como
 * JSON (objeto), nunca por coincidencia de texto.
 *
 * <p>Moderación previa ({@link ChatLegalGuard} y {@link TextModerationService}) antes de llamar a Claude.
 * Costo por llamada en {@link ClaudeUsoRegistrador}. Circuit breaker y reintento viven en
 * {@link ClienteClaudeHttp}; si Claude falla, la conversación se deriva a una persona (modo de fallo).
 * Los logs no llevan texto del cliente, teléfono ni inputs de herramientas.
 */
@Service
public class MotorAgente {

    private static final Logger log = LoggerFactory.getLogger(MotorAgente.class);

    static final int TEXTO_TURNO_MAX = 2_000;
    static final int RESULTADO_HERRAMIENTA_MAX = 8_000;
    static final String RESPUESTA_MODERACION =
        "Solo puedo ayudar con consultas sobre el negocio y sus productos.";

    private final ClienteClaude cliente;
    private final RegistroHerramientas registro;
    private final ConfigMotorAgente config;
    private final TextModerationService moderacion;
    private final ClaudeUsoRegistrador usoRegistrador;
    private final ClaudePrecios precios;
    private final ObjectMapper mapper;

    public MotorAgente(ClienteClaude cliente, RegistroHerramientas registro, ConfigMotorAgente config,
                       TextModerationService moderacion, ClaudeUsoRegistrador usoRegistrador,
                       ClaudePrecios precios, ObjectMapper mapper) {
        this.cliente = cliente;
        this.registro = registro;
        this.config = config;
        this.moderacion = moderacion;
        this.usoRegistrador = usoRegistrador;
        this.precios = precios;
        this.mapper = mapper;
    }

    public ResultadoAgente ejecutar(PerfilAgente perfil, ContextoHerramienta contexto,
                                    List<TurnoConversacion> historial, String entrada) {
        return ejecutar(perfil, contexto, historial, entrada, OpcionesMotor.POR_DEFECTO);
    }

    /**
     * Igual que la versión base pero con opciones por llamada: tono propio del negocio (AG-19) y herramientas
     * excluidas (el simulador del panel no puede crear enlaces de compra). {@code null} = valores por defecto.
     */
    public ResultadoAgente ejecutar(PerfilAgente perfil, ContextoHerramienta contexto,
                                    List<TurnoConversacion> historial, String entrada, OpcionesMotor opciones) {
        OpcionesMotor op = opciones == null ? OpcionesMotor.POR_DEFECTO : opciones;
        TonoAgente tono = op.tono() == null ? config.tono() : op.tono();
        if (perfil == null || contexto == null || contexto.perfil() != perfil) {
            throw new IllegalArgumentException("El contexto debe corresponder al perfil indicado");
        }
        String modelo = config.modeloDe(perfil);
        if (entrada == null || entrada.isBlank()) {
            return sinLlamada("", modelo, MotivoFin.ENTRADA_VACIA);
        }
        // Moderación y guard legal ANTES de cualquier llamada a Claude.
        ChatLegalGuard.Motivo motivoLegal = ChatLegalGuard.revisar(entrada);
        if (motivoLegal != ChatLegalGuard.Motivo.OK) {
            return sinLlamada(ChatLegalGuard.respuesta(motivoLegal), modelo, MotivoFin.MODERACION);
        }
        if (!moderacion.moderar(entrada).safe()) {
            return sinLlamada(RESPUESTA_MODERACION, modelo, MotivoFin.MODERACION);
        }

        List<HerramientaAgente> herramientas = registro.paraPerfil(perfil).stream()
            .filter(h -> !op.excluidas().contains(h.nombre())).toList();
        List<Object> system = construirSystem(perfil, contexto, tono);
        List<Map<String, Object>> tools = construirTools(herramientas);
        List<Map<String, Object>> mensajes = construirMensajes(historial, entrada);

        List<AccionAgente> acciones = new ArrayList<>();
        UsoTokens uso = UsoTokens.VACIO;
        long limite = System.currentTimeMillis() + config.presupuestoMs();
        int llamadas = 0;

        for (int i = 0; i < config.maxIteraciones(); i++) {
            if (System.currentTimeMillis() >= limite) {
                return derivar(MotivoFin.TIEMPO_AGOTADO, acciones, uso, modelo, llamadas, contexto, tono);
            }
            String cuerpo = serializar(modelo, perfil, system, tools, mensajes);
            ClienteClaude.RespuestaClaude resp;
            try {
                llamadas++;
                resp = cliente.enviar(cuerpo);
            } catch (RuntimeException e) {
                // Incluye circuit breaker abierto. Sin mensaje: puede traer datos.
                log.warn("[agente-motor] empresa={} perfil={} proveedor no disponible: {}",
                    contexto.empresaId(), perfil, e.getClass().getSimpleName());
                return derivar(MotivoFin.ERROR_PROVEEDOR, acciones, uso, modelo, llamadas, contexto, tono);
            }
            if (resp == null || resp.status() != 200) {
                log.warn("[agente-motor] empresa={} perfil={} Claude HTTP {}", contexto.empresaId(), perfil,
                    resp == null ? -1 : resp.status());
                return derivar(MotivoFin.ERROR_PROVEEDOR, acciones, uso, modelo, llamadas, contexto, tono);
            }
            JsonNode nodo;
            try {
                nodo = mapper.readTree(resp.cuerpo());
            } catch (JsonProcessingException e) {
                log.warn("[agente-motor] empresa={} perfil={} respuesta no es JSON", contexto.empresaId(), perfil);
                return derivar(MotivoFin.ERROR_PROVEEDOR, acciones, uso, modelo, llamadas, contexto, tono);
            }
            UsoTokens vuelta = UsoTokens.desdeUsage(nodo.path("usage"));
            uso = uso.mas(vuelta);
            usoRegistrador.registrar(contexto.empresaId(), vuelta);

            JsonNode contenido = nodo.path("content");
            String stop = nodo.path("stop_reason").asText("");
            switch (stop) {
                case "end_turn", "stop_sequence" -> {
                    String texto = extraerTexto(contenido);
                    if (texto.isBlank()) {
                        return derivar(MotivoFin.ERROR_PROVEEDOR, acciones, uso, modelo, llamadas, contexto, tono);
                    }
                    return resultado(texto, acciones, uso, modelo, MotivoFin.COMPLETO, llamadas);
                }
                case "tool_use" -> {
                    if (!procesarToolUse(perfil, contexto, contenido, mensajes, acciones, op)) {
                        return derivar(MotivoFin.ERROR_PROVEEDOR, acciones, uso, modelo, llamadas, contexto, tono);
                    }
                }
                case "refusal" -> {
                    log.warn("[agente-motor] empresa={} perfil={} refusal categoria={}", contexto.empresaId(), perfil,
                        nodo.path("stop_details").path("category").asText("n/d"));
                    return derivar(MotivoFin.REFUSAL, acciones, uso, modelo, llamadas, contexto, tono);
                }
                case "max_tokens" -> {
                    // No se ejecutan herramientas ni se envía texto cortado a medias.
                    log.warn("[agente-motor] empresa={} perfil={} max_tokens", contexto.empresaId(), perfil);
                    return derivar(MotivoFin.MAX_TOKENS, acciones, uso, modelo, llamadas, contexto, tono);
                }
                default -> {
                    log.warn("[agente-motor] empresa={} perfil={} stop_reason inesperado={}", contexto.empresaId(), perfil, stop);
                    return derivar(MotivoFin.ERROR_PROVEEDOR, acciones, uso, modelo, llamadas, contexto, tono);
                }
            }
        }
        log.warn("[agente-motor] empresa={} perfil={} tope de iteraciones ({})", contexto.empresaId(), perfil, config.maxIteraciones());
        return derivar(MotivoFin.TOPE_ITERACIONES, acciones, uso, modelo, llamadas, contexto, tono);
    }

    // ── Herramientas ──────────────────────────────────────────────────────────

    /** @return false si la respuesta decía tool_use pero no traía bloques tool_use. */
    private boolean procesarToolUse(PerfilAgente perfil, ContextoHerramienta contexto, JsonNode contenido,
                                    List<Map<String, Object>> mensajes, List<AccionAgente> acciones,
                                    OpcionesMotor op) {
        List<Map<String, Object>> resultados = new ArrayList<>();
        for (JsonNode bloque : contenido) {
            if (!"tool_use".equals(bloque.path("type").asText())) continue;
            resultados.add(ejecutarBloque(perfil, contexto, bloque, acciones, op));
        }
        if (resultados.isEmpty()) return false;
        // Turno del asistente con TODOS los bloques tal cual (thinking incluido), luego un solo mensaje de resultados.
        mensajes.add(mensaje("assistant", mapper.convertValue(contenido, Object.class)));
        mensajes.add(mensaje("user", resultados));
        return true;
    }

    private Map<String, Object> ejecutarBloque(PerfilAgente perfil, ContextoHerramienta contexto, JsonNode bloque,
                                               List<AccionAgente> acciones, OpcionesMotor op) {
        String id = bloque.path("id").asText();
        String nombre = bloque.path("name").asText();
        JsonNode input = bloque.path("input");
        ResultadoHerramienta r;
        Optional<HerramientaAgente> herramienta = op.excluidas().contains(nombre)
            ? Optional.empty() : registro.permitida(perfil, nombre);
        if (herramienta.isEmpty()) {
            log.warn("[agente-motor] empresa={} perfil={} herramienta no permitida: {}", contexto.empresaId(), perfil, nombre);
            r = ResultadoHerramienta.error("Herramienta no disponible para este asistente.");
        } else if (!input.isObject()) {
            r = ResultadoHerramienta.error("Entrada inválida: se esperaba un objeto JSON.");
        } else {
            try {
                r = herramienta.get().ejecutar(contexto, input);
            } catch (RuntimeException e) {
                log.warn("[agente-motor] empresa={} perfil={} herramienta={} falló: {}", contexto.empresaId(), perfil,
                    nombre, e.getClass().getSimpleName());
                r = ResultadoHerramienta.error("No se pudo obtener el dato en este momento.");
            }
        }
        AccionAgente accion = r.accion();
        if (accion != null && acciones.stream().noneMatch(a -> a.tipo() == accion.tipo())) {
            acciones.add(accion);
        }
        String texto = r.contenido() == null ? "" : r.contenido();
        if (texto.length() > RESULTADO_HERRAMIENTA_MAX) texto = texto.substring(0, RESULTADO_HERRAMIENTA_MAX);
        Map<String, Object> tr = new LinkedHashMap<>();
        tr.put("type", "tool_result");
        tr.put("tool_use_id", id);
        tr.put("content", texto);
        if (r.esError()) tr.put("is_error", true);
        return tr;
    }

    // ── Request ───────────────────────────────────────────────────────────────

    /** System como bloque con cache_control (prefijo estable: tools + system). */
    private List<Object> construirSystem(PerfilAgente perfil, ContextoHerramienta contexto, TonoAgente tono) {
        Map<String, Object> bloque = new LinkedHashMap<>();
        bloque.put("type", "text");
        bloque.put("text", perfil.promptSistema(tono, contexto.nombreNegocio()));
        bloque.put("cache_control", Map.of("type", "ephemeral"));
        return List.of(bloque);
    }

    private List<Map<String, Object>> construirTools(List<HerramientaAgente> herramientas) {
        List<Map<String, Object>> tools = new ArrayList<>();
        for (HerramientaAgente h : herramientas) {
            tools.add(new LinkedHashMap<>(h.definicion()));
        }
        if (!tools.isEmpty()) {
            tools.get(tools.size() - 1).put("cache_control", Map.of("type", "ephemeral"));
        }
        return tools;
    }

    private List<Map<String, Object>> construirMensajes(List<TurnoConversacion> historial, String entrada) {
        List<Map<String, Object>> mensajes = new ArrayList<>();
        if (historial != null) {
            int desde = Math.max(0, historial.size() - config.maxTurnosHistorial());
            for (TurnoConversacion t : historial.subList(desde, historial.size())) {
                if (t == null || t.texto() == null || t.texto().isBlank()) continue;
                boolean usuario = t.rol() == TurnoConversacion.Rol.USUARIO;
                // La conversación debe empezar con un turno del usuario.
                if (mensajes.isEmpty() && !usuario) continue;
                String texto = t.texto().length() > TEXTO_TURNO_MAX ? t.texto().substring(0, TEXTO_TURNO_MAX) : t.texto();
                mensajes.add(mensaje(usuario ? "user" : "assistant", texto));
            }
        }
        // Sin prefill: el último mensaje siempre es del usuario.
        String actual = entrada.length() > TEXTO_TURNO_MAX ? entrada.substring(0, TEXTO_TURNO_MAX) : entrada;
        mensajes.add(mensaje("user", actual));
        return mensajes;
    }

    private String serializar(String modelo, PerfilAgente perfil, List<Object> system,
                              List<Map<String, Object>> tools, List<Map<String, Object>> mensajes) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", modelo);
        body.put("max_tokens", config.maxTokens());
        body.put("system", system);
        if (!tools.isEmpty()) {
            body.put("tools", tools);
            body.put("tool_choice", Map.of("type", "auto")); // forced no se permite en modelos 5.5
        }
        body.put("output_config", Map.of("effort", config.esfuerzoDe(perfil)));
        body.put("messages", mensajes);
        try {
            return mapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo serializar el request a Claude", e);
        }
    }

    private static Map<String, Object> mensaje(String rol, Object contenido) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("role", rol);
        m.put("content", contenido);
        return m;
    }

    private static String extraerTexto(JsonNode contenido) {
        StringBuilder sb = new StringBuilder();
        for (JsonNode b : contenido) {
            if ("text".equals(b.path("type").asText())) sb.append(b.path("text").asText(""));
        }
        return sb.toString().trim();
    }

    // ── Resultados ────────────────────────────────────────────────────────────

    private ResultadoAgente derivar(MotivoFin motivo, List<AccionAgente> acciones, UsoTokens uso, String modelo,
                                    int llamadas, ContextoHerramienta contexto, TonoAgente tono) {
        List<AccionAgente> todas = new ArrayList<>(acciones);
        if (todas.stream().noneMatch(a -> a.tipo() == AccionAgente.Tipo.PASAR_A_PERSONA)) {
            todas.add(AccionAgente.pasarAPersona("Derivación automática: " + motivo));
        }
        String texto = tono.segun(
            "Gracias por escribirnos. Para ayudarle mejor, le paso con una persona del equipo, que le responderá en breve.",
            "Gracias por escribirnos. Para ayudarte mejor, te paso con una persona del equipo, que te responderá en breve.");
        return resultado(texto, todas, uso, modelo, motivo, llamadas);
    }

    private ResultadoAgente sinLlamada(String texto, String modelo, MotivoFin motivo) {
        return resultado(texto, List.of(), UsoTokens.VACIO, modelo, motivo, 0);
    }

    private ResultadoAgente resultado(String texto, List<AccionAgente> acciones, UsoTokens uso, String modelo,
                                      MotivoFin motivo, int llamadas) {
        double costo = precios.paraModelo(modelo).costoUsd(uso.entrada(), uso.salida(), uso.cacheLectura(), uso.cacheEscritura());
        return new ResultadoAgente(texto, acciones, uso, costo, modelo, motivo, llamadas);
    }
}
