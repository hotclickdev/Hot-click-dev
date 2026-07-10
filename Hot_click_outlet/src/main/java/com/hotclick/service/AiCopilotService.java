package com.hotclick.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.model.AiMensaje;
import com.hotclick.model.Empresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.AiMensajeRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.net.ConnectException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletionException;

/**
 * AI Copilot — dos proveedores, uno por canal:
 *   - chatStream (panel admin, SSE) sigue en NVIDIA NIM (OpenAI-compatible).
 *   - chatSync/crossSellCliente (bot de Telegram) usan Claude (Anthropic Messages
 *     API): el tier gratuito de NVIDIA demostró ser intermitentemente lento/no
 *     disponible bajo uso real (ver memoria del proyecto), y Claude ya es
 *     confiable en producción para el asistente de compras de esta misma app.
 *
 * Uses Java 21 HttpClient — no external SDK required.
 * Streams la respuesta del panel via SSE para evitar timeouts de conexión.
 * Cuando la api-key correspondiente está vacía, devuelve una respuesta mock (dev mode).
 *
 * Context injected into every system prompt:
 *   - Empresa name, plan, country
 *   - Last 7 days KPIs (orders, revenue, top products)
 *   - Low-stock alerts
 */
@Service
public class AiCopilotService {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotService.class);
    private static final int    HISTORY_TURNS      = 8;      // last N messages sent as context — bounds input tokens
    private static final int    MAX_RESPONSE_CHARS = 8_000;  // hard cap — stops runaway stream output loops
    private static final int    MAX_TOOL_ROUNDS    = 4;      // tope de idas-y-vueltas tool-calling — evita loops infinitos
    private static final long   TOOL_LOOP_BUDGET_MS = 40_000; // presupuesto total del loop — NVIDIA es intermitentemente lenta
    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    // Apunta directo a NVIDIA NIM por defecto. Para pasar por el sidecar de
    // NeMo Guardrails (security-tools/guardrails/), setear NVIDIA_BASE_URL=
    // http://guardrails:8001/v1/ — ver security-tools/guardrails/README.md.
    @Value("${nvidia.base-url}chat/completions")
    private String nvidiaUrl;

    @Value("${nvidia.api-key:}")
    private String apiKey;

    // llama-3.3-70b figura DEGRADED en NVIDIA NIM (400 "DEGRADED function cannot
    // be invoked") — 3.1-70b es el reemplazo verificado que responde 200.
    @Value("${nvidia.model:meta/llama-3.1-70b-instruct}")
    private String model;

    // ── Claude (Anthropic) — motor del chat del bot de Telegram ────────────────
    private static final String CLAUDE_URL = "https://api.anthropic.com/v1/messages";

    @Value("${anthropic.api-key:}")
    private String claudeApiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String claudeModel;

    @Autowired private AiMensajeRepository     aiMensajeRepository;
    @Autowired private AiQuotaService          aiQuotaService;
    @Autowired private EmpresaRepository       empresaRepository;
    @Autowired private ObjectMapper            objectMapper;
    @Autowired private JdbcTemplate            jdbc;
    @Autowired private InventoryForecastService inventoryForecastService;
    @Autowired private TenantService           tenantService;
    @Autowired private FinanzasReporteService  finanzasReporteService;
    @Autowired private UsuarioRepository       usuarioRepository;

    // ── Public API ────────────────────────────────────────────────────────────

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    private boolean isClaudeEnabled() {
        return claudeApiKey != null && !claudeApiKey.isBlank();
    }

    /** Returns the last HISTORY_TURNS messages for the empresa. */
    public List<Map<String, Object>> getHistorial(Long empresaId) {
        return aiMensajeRepository.findByEmpresaIdOrderByFechaCreacionAsc(
            empresaId, PageRequest.of(0, 50))
            .stream().map(m -> Map.<String, Object>of(
                "id",       m.getId(),
                "rol",      m.getRol(),
                "contenido", m.getContenido(),
                "fecha",    m.getFechaCreacion() != null ? m.getFechaCreacion().toString() : ""
            )).collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void limpiarHistorial(Long empresaId) {
        aiMensajeRepository.deleteByEmpresaId(empresaId);
    }

    private static final int DESCUENTO_SUGERIDO_PCT = 15;

    /**
     * Productos sin ventas en 60+ días, con la acción que el Copilot puede sugerir
     * (aplicar descuento). Es solo lectura — la ejecución real pasa por el endpoint
     * existente PATCH /api/productos/{id}/oferta, que el dueño o ADMIN debe confirmar
     * explícitamente desde la UI. El Copilot nunca aplica cambios por sí mismo.
     */
    public List<Map<String, Object>> getProductosSinVentaAccionables(Long empresaId) {
        return inventoryForecastService.productosLentosMovimiento(empresaId).stream()
            .limit(8)
            .map(p -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",             p.get("id_producto"));
                m.put("nombre",         p.get("nombre_producto"));
                m.put("stock",          p.get("stock_actual"));
                m.put("diasSinVenta",   diasDesde(p.get("fecha_ultima_venta")));
                m.put("descuentoSugeridoPct", DESCUENTO_SUGERIDO_PCT);
                return m;
            })
            .collect(java.util.stream.Collectors.toList());
    }

    private static final List<String> SUGERENCIAS_EVERGREEN = List.of(
        "¿Cómo van mis ventas esta semana?",
        "¿Cuáles son mis productos más vendidos?",
        "¿Qué cliente me compra más un producto específico?",
        "Dame un resumen de mi negocio"
    );

    /**
     * Preguntas sugeridas para el chat: primero las que reflejan un hallazgo real
     * del negocio (stock crítico, productos sin venta, pedidos pendientes), después
     * se completa con preguntas genéricas hasta un máximo de 4.
     * Nunca lanza — si los datos no están disponibles, cae a las genéricas.
     */
    public List<String> getSugerencias(Long empresaId) {
        List<String> chips = new ArrayList<>();
        try {
            int lentos = inventoryForecastService.productosLentosMovimiento(empresaId).size();
            if (lentos > 0) {
                chips.add(String.format("Tengo %d producto%s sin ventas en 60+ días, ¿cuáles son y qué hago?",
                    lentos, lentos == 1 ? "" : "s"));
            }

            int enRiesgo = inventoryForecastService.productosEnRiesgo(empresaId).size();
            if (enRiesgo > 0) {
                chips.add(String.format("Tengo %d producto%s con stock crítico, ¿cuáles son?",
                    enRiesgo, enRiesgo == 1 ? "" : "s"));
            }

            int pendientes = countPedidosPendientes(empresaId);
            if (pendientes > 0) {
                chips.add(String.format("Tengo %d pedido%s pendiente%s de despachar, ¿cuáles priorizo?",
                    pendientes, pendientes == 1 ? "" : "s", pendientes == 1 ? "" : "s"));
            }
        } catch (DataAccessException e) {
            log.warn("[AI-Copilot] empresaId={} sugerencias dinámicas no disponibles: {}", empresaId, e.getMessage());
        }

        for (String s : SUGERENCIAS_EVERGREEN) {
            if (chips.size() >= 4) break;
            chips.add(s);
        }
        return chips;
    }

    private int countPedidosPendientes(Long empresaId) {
        String sql = """
            SELECT COUNT(*) FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND estado_pedido IN ('PAGADO','PROCESANDO','PREPARANDO')
            """;
        Integer count = jdbc.queryForObject(sql, Integer.class, empresaId);
        return count != null ? count : 0;
    }

    /**
     * Main streaming endpoint.
     * Saves the user message, streams NVIDIA's reply via SSE,
     * then saves the assistant message and updates quota.
     */
    @CircuitBreaker(name = "nvidia", fallbackMethod = "chatStreamFallback")
    public void chatStream(Long empresaId, String userMessage, SseEmitter emitter) {
        // TenantContext sobrevive el salto a sseExecutor (TenantAwareTaskDecorator),
        // pero NO sobrevive al callback de HttpClient.sendAsync más abajo — ese corre
        // en un hilo propio del HttpClient. Por eso se captura aquí y se pasa explícito.
        Long tenantId = TenantContext.get();

        // Reserva slot atómicamente antes del HTTP call — elimina race condition TOCTOU
        if (!aiQuotaService.verificarYReservar(empresaId)) {
            sendError(emitter, "Cuota mensual de AI agotada. Actualiza tu plan.");
            return;
        }

        // Save user message
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        saveMsg(empresa, "user", userMessage, 0);

        if (!isEnabled()) {
            // Mock mode for development
            streamMock(emitter, "*(modo desarrollo — configura NVIDIA_API_KEY para respuestas reales)*\n\nHola, soy tu copilot de HOTCLICK. ¿En qué te puedo ayudar con tu negocio?");
            saveMsg(empresa, "assistant", "Mock response", 0);
            return;
        }

        try {
            Intent intent = detectIntent(userMessage);

            // Build messages array para NVIDIA (formato OpenAI chat completions)
            List<Map<String, Object>> messages = buildMessages(empresaId, userMessage);
            String systemPrompt = buildSystemPrompt(empresaId, intent);
            String requestBody  = buildRequestBody(systemPrompt, messages, tenantId);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(nvidiaUrl))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .header("Accept", "text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                .build();

            HTTP.sendAsync(request, HttpResponse.BodyHandlers.ofLines())
                .thenAccept(response -> processStream(response, emitter, empresa, empresaId))
                .exceptionally(ex -> {
                    reportNvidiaFailure(unwrap(ex), tenantId, emitter);
                    return null;
                });
        } catch (IntegracionExternaException e) {
            reportNvidiaFailure(e, tenantId, emitter);
        }
    }

    /**
     * Variante síncrona (sin SSE) para canales que necesitan la respuesta completa
     * en un solo string — hoy la usa el bot de Telegram.
     *
     * Reserva cuota igual que chatStream (verificarYReservar antes del call).
     * Retorna {@code null} cuando el PROVEEDOR de IA falló (timeout/HTTP error) —
     * el caller decide su propio fallback. Cuota agotada y modo-desarrollo sí
     * devuelven mensaje, porque son respuestas definitivas, no fallos transitorios.
     */
    public String chatSync(Long empresaId, String userMessage) {
        return chatSync(empresaId, userMessage, null);
    }

    /** Variante con el nombre del usuario que escribe (Telegram) para personalizar el saludo/tono. */
    public String chatSync(Long empresaId, String userMessage, String nombreUsuario) {
        if (!aiQuotaService.verificarYReservar(empresaId)) {
            return "Se agotó la cuota mensual de consultas con IA de tu plan. Podés seguir usando los botones del menú (/menu), que no consumen cuota.";
        }

        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        saveMsg(empresa, "user", userMessage, 0);

        if (!isClaudeEnabled()) {
            String mock = "(modo desarrollo — configurá ANTHROPIC_API_KEY para respuestas reales)\n\nHola, soy tu copilot de HotClick. ¿En qué te ayudo con tu negocio?";
            saveMsg(empresa, "assistant", mock, 0);
            return mock;
        }

        try {
            List<Map<String, Object>> messages = buildMessages(empresaId, userMessage);
            String systemPrompt = buildSystemPromptConTools(empresaId, empresa, nombreUsuario);
            List<Map<String, Object>> tools = buildTools(empresaId);

            int tokensInTotal = 0, tokensOutTotal = 0;
            String texto = null;
            // Presupuesto total: evita que varias rondas de tool-calling lentas
            // seguidas dejen al usuario esperando mucho antes de recibir el fallback.
            long deadline = System.currentTimeMillis() + TOOL_LOOP_BUDGET_MS;

            for (int ronda = 0; ronda < MAX_TOOL_ROUNDS; ronda++) {
                if (System.currentTimeMillis() >= deadline) {
                    log.warn("[AI-sync] empresaId={} se acabó el presupuesto de tiempo de Claude (ronda {})", empresaId, ronda);
                    return null;
                }

                String requestBody = buildRequestBodyClaude(systemPrompt, messages, tools);

                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(CLAUDE_URL))
                    // 25s y no 60s: en un chat nadie espera más, y el caller necesita
                    // enterarse rápido del fallo para activar su fallback.
                    .timeout(Duration.ofSeconds(25))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", claudeApiKey)
                    .header("anthropic-version", "2023-06-01")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

                HttpResponse<String> response;
                try {
                    response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
                } catch (HttpTimeoutException e) {
                    if (System.currentTimeMillis() >= deadline) {
                        log.warn("[AI-sync] empresaId={} timeout en ronda {} y sin presupuesto para reintentar", empresaId, ronda);
                        return null;
                    }
                    log.warn("[AI-sync] empresaId={} timeout en ronda {} — reintentando una vez", empresaId, ronda);
                    response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
                }
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    log.error("[AI-sync] empresaId={} Claude respondió {} — {}", empresaId, response.statusCode(), response.body());
                    return null;
                }

                JsonNode node    = objectMapper.readTree(response.body());
                JsonNode content = node.path("content");
                tokensInTotal  += node.path("usage").path("input_tokens").asInt(0);
                tokensOutTotal += node.path("usage").path("output_tokens").asInt(0);

                if ("tool_use".equals(node.path("stop_reason").asText(""))) {
                    Map<String, Object> assistantMsg = new LinkedHashMap<>();
                    assistantMsg.put("role", "assistant");
                    assistantMsg.put("content", objectMapper.convertValue(content, Object.class));
                    messages.add(assistantMsg);

                    List<Map<String, Object>> resultados = new ArrayList<>();
                    for (JsonNode block : content) {
                        if (!"tool_use".equals(block.path("type").asText())) continue;
                        String toolUseId = block.path("id").asText();
                        String toolName  = block.path("name").asText();
                        String resultado = ejecutarTool(empresaId, toolName, block.path("input"));
                        Map<String, Object> tr = new LinkedHashMap<>();
                        tr.put("type", "tool_result");
                        tr.put("tool_use_id", toolUseId);
                        tr.put("content", resultado);
                        resultados.add(tr);
                    }
                    Map<String, Object> userMsg = new LinkedHashMap<>();
                    userMsg.put("role", "user");
                    userMsg.put("content", resultados);
                    messages.add(userMsg);
                    continue; // deja que el modelo use los resultados en la siguiente ronda
                }

                StringBuilder textoSb = new StringBuilder();
                for (JsonNode block : content) {
                    if ("text".equals(block.path("type").asText())) textoSb.append(block.path("text").asText(""));
                }
                texto = textoSb.toString();
                break;
            }

            if (texto == null || texto.isBlank()) {
                return "No pude generar una respuesta. Probá reformular la pregunta.";
            }
            if (texto.length() > MAX_RESPONSE_CHARS) texto = texto.substring(0, MAX_RESPONSE_CHARS);

            saveMsg(empresa, "assistant", texto, tokensOutTotal);
            aiQuotaService.actualizarTokens(empresaId, tokensInTotal, tokensOutTotal);
            return texto;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.error("[AI-sync] empresaId={} fallo llamando a NVIDIA — {}", empresaId, e.getMessage());
            return null;
        }
    }

    /**
     * Sugerencia de cross-sell para un cliente puntual — la usa el flujo de
     * "Clientes" del bot de Telegram (TelegramFlujoService.sugerirCrossSellAsync)
     * para redactar 2-3 productos que ofrecerle según lo que ya compró.
     *
     * Es una llamada puntual, no una conversación: no consume el historial de
     * hot_click_ai_mensaje_tb ni escribe en él. Retorna {@code null} si la IA
     * no está disponible o no hay suficiente historial/candidatos para sugerir —
     * el caller cae a su propio fallback SQL.
     */
    public String crossSellCliente(Long empresaId, Long clienteId) {
        if (!isClaudeEnabled()) return null;

        List<String> nombreRows = jdbc.queryForList(
            "SELECT nombre FROM hot_click_usuario_tb WHERE id_usuario = ?", String.class, clienteId);
        String nombreCliente = nombreRows.isEmpty() ? "el cliente" : nombreRows.get(0);

        List<String> comprados = jdbc.queryForList("""
            SELECT DISTINCT p.nombre_producto
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb ped ON pi.fk_id_pedido = ped.id_pedido
            JOIN hot_click_producto_tb p ON pi.fk_id_producto = p.id_producto
            WHERE ped.fk_id_usuario_final = ? AND ped.fk_id_empresa = ?
            ORDER BY p.nombre_producto LIMIT 15
            """, String.class, clienteId, empresaId);
        if (comprados.isEmpty()) return null; // sin historial, no hay base para sugerir

        var candidatos = jdbc.queryForList("""
            SELECT pr.nombre_producto, pr.precio_venta
            FROM hot_click_producto_tb pr
            WHERE pr.fk_id_empresa = ? AND pr.fk_id_estado = 1 AND pr.visible_catalogo = TRUE
              AND (pr.stock_actual - COALESCE(pr.stock_reservado, 0)) > 0
              AND pr.fk_id_categoria IN (
                  SELECT DISTINCT pr2.fk_id_categoria
                  FROM hot_click_pedido_item_tb pi
                  JOIN hot_click_pedido_tb p ON pi.fk_id_pedido = p.id_pedido
                  JOIN hot_click_producto_tb pr2 ON pi.fk_id_producto = pr2.id_producto
                  WHERE p.fk_id_usuario_final = ? AND p.fk_id_empresa = ?)
              AND pr.id_producto NOT IN (
                  SELECT pi.fk_id_producto
                  FROM hot_click_pedido_item_tb pi
                  JOIN hot_click_pedido_tb p ON pi.fk_id_pedido = p.id_pedido
                  WHERE p.fk_id_usuario_final = ? AND p.fk_id_empresa = ?)
            ORDER BY pr.id_producto DESC
            LIMIT 10
            """, empresaId, clienteId, empresaId, clienteId, empresaId);
        if (candidatos.isEmpty()) return null;

        java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
        StringBuilder datos = new StringBuilder();
        datos.append("Cliente: ").append(nombreCliente).append("\n");
        datos.append("Ya compró: ").append(String.join(", ", comprados)).append("\n\n");
        datos.append("Productos disponibles que aún no compró (mismas categorías de interés):\n");
        candidatos.forEach(p -> datos.append(String.format("  - %s — ₡%s%n",
            p.get("nombre_producto"), fmt.format(p.get("precio_venta")))));

        String systemPrompt = """
            Sos el Copilot de HOTCLICK. Vas a redactar una sugerencia breve de cross-sell
            para que el dueño del negocio se la envíe a un cliente puntual por WhatsApp.
            Tono costarricense, cercano, natural — nunca corporativo. Elegí 2 o 3 productos
            como máximo de la lista de candidatos, explicá brevemente por qué le podrían
            interesar según lo que ya compró. Máximo 80 palabras. No inventés productos
            fuera de la lista.

            %s
            """.formatted(datos);

        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", claudeModel);
            body.put("max_tokens", 300);
            body.put("system", systemPrompt);
            body.put("messages", List.of(Map.of("role", "user", "content", "Generá la sugerencia.")));

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(CLAUDE_URL))
                .timeout(Duration.ofSeconds(25))
                .header("Content-Type", "application/json")
                .header("x-api-key", claudeApiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("[AI-crosssell] empresaId={} clienteId={} Claude respondió {}", empresaId, clienteId, response.statusCode());
                return null;
            }
            JsonNode node = objectMapper.readTree(response.body());
            StringBuilder textoSb = new StringBuilder();
            for (JsonNode block : node.path("content")) {
                if ("text".equals(block.path("type").asText())) textoSb.append(block.path("text").asText(""));
            }
            String texto = textoSb.toString().trim();
            return texto.isBlank() ? null : texto;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.error("[AI-crosssell] empresaId={} clienteId={} fallo llamando a Claude — {}", empresaId, clienteId, e.getMessage());
            return null;
        }
    }

    private static Throwable unwrap(Throwable ex) {
        return ex instanceof CompletionException && ex.getCause() != null ? ex.getCause() : ex;
    }

    /**
     * Punto único de clasificación + logging para fallos de Claude API.
     *
     * Importante: esto NO llega a GlobalExceptionHandler. El SseEmitter ya fue
     * devuelto al controller antes de que chatStream termine, y el callback de
     * sendAsync().exceptionally() puede correr en un hilo distinto al de la
     * request. La observabilidad real para este flujo es el logging estructurado
     * (lo que Grafana/Datadog scrapean) + un evento "error" explícito por SSE —
     * no el manejador @ExceptionHandler, que aquí es inalcanzable.
     */
    private void reportNvidiaFailure(Throwable cause, Long tenantId, SseEmitter emitter) {
        IntegracionExternaException integrationEx;
        if (cause instanceof IntegracionExternaException iee) {
            integrationEx = iee;
        } else {
            IntegracionExternaException.Tipo tipo;
            if (cause instanceof HttpTimeoutException) {
                tipo = IntegracionExternaException.Tipo.TIMEOUT;
            } else if (cause instanceof ConnectException || cause instanceof IOException) {
                tipo = IntegracionExternaException.Tipo.IO_ERROR;
            } else {
                tipo = IntegracionExternaException.Tipo.DESCONOCIDO;
            }
            integrationEx = new IntegracionExternaException(
                "nvidia-api", tipo, tenantId, "Fallo llamando a NVIDIA API", cause);
        }

        log.error("[AI] tenantId={} integracion={} tipo={} msg={}",
            tenantId, integrationEx.getIntegracion(), integrationEx.getTipo(), integrationEx.getMessage(), integrationEx);

        // Mensaje genérico al cliente — nunca se expone el detalle interno de la excepción.
        sendError(emitter, "El asistente AI no está disponible temporalmente. Intenta de nuevo en unos minutos.");
    }

    private void chatStreamFallback(Long empresaId, String userMessage, SseEmitter emitter, Throwable t) {
        Long tenantId = TenantContext.get();
        IntegracionExternaException integrationEx = new IntegracionExternaException(
            "nvidia-api", IntegracionExternaException.Tipo.RATE_LIMIT, tenantId,
            "Circuit breaker abierto para NVIDIA API", t);
        log.error("[nvidia-circuit] OPEN tenantId={} msg={}", tenantId, integrationEx.getMessage(), integrationEx);
        sendError(emitter, "El asistente AI no está disponible temporalmente. Intente en unos minutos.");
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void processStream(HttpResponse<java.util.stream.Stream<String>> response,
                               SseEmitter emitter, Empresa empresa, Long empresaId) {
        StringBuilder fullText = new StringBuilder();
        int[] tokenCount = {0, 0}; // [input, output]

        try {
            response.body().forEach(line -> {
                if (line.startsWith("data: ")) {
                    String json = line.substring(6).trim();
                    if ("[DONE]".equals(json)) return;
                    try {
                        JsonNode node = objectMapper.readTree(json);

                        // El chunk final (stream_options.include_usage=true) trae "usage" con
                        // choices vacío o ausente — se lee independiente del texto de este chunk.
                        JsonNode usage = node.path("usage");
                        if (usage.isObject()) {
                            tokenCount[0] = usage.path("prompt_tokens").asInt(tokenCount[0]);
                            tokenCount[1] = usage.path("completion_tokens").asInt(tokenCount[1]);
                        }

                        String text = node.path("choices").path(0).path("delta").path("content").asText("");
                        if (!text.isEmpty()) {
                            // Hard cap: kill stream if response grows unreasonably large (loop guard)
                            if (fullText.length() >= MAX_RESPONSE_CHARS) return;
                            fullText.append(text);
                            try {
                                emitter.send(SseEmitter.event().name("delta")
                                    .data(objectMapper.writeValueAsString(Map.of("text", text))));
                            } catch (IOException e) {
                                // Cliente cerró la pestaña/conexión a mitad del stream — esperado, no es
                                // un fallo de la integración con NVIDIA. No se loguea como error.
                                log.debug("[AI] empresaId={} cliente desconectado durante stream: {}", empresaId, e.getMessage());
                            }
                        }
                    } catch (JsonProcessingException e) {
                        // Un chunk SSE individual de NVIDIA vino malformado — se descarta ese chunk
                        // y se sigue con el stream, pero queda visible si el payload de NVIDIA cambió.
                        log.warn("[AI] empresaId={} chunk SSE de NVIDIA no se pudo parsear: {}", empresaId, e.getMessage());
                    }
                }
            });

            emitter.send(SseEmitter.event().name("done").data("{}"));
            emitter.complete();

            // Save assistant reply + actualiza solo tokens (llamadas ya fue incrementado antes del call)
            saveMsg(empresa, "assistant", fullText.toString(), tokenCount[1]);
            aiQuotaService.actualizarTokens(empresaId, tokenCount[0], tokenCount[1]);

        } catch (IOException e) {
            log.error("[AI] empresaId={} error de E/S procesando stream de NVIDIA: {}", empresaId, e.getMessage(), e);
            sendError(emitter, "Error procesando respuesta del AI");
        }
    }

    private void streamMock(SseEmitter emitter, String text) {
        try {
            String[] words = text.split(" ");
            for (String w : words) {
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", w + " "))));
                Thread.sleep(20);
            }
            emitter.send(SseEmitter.event().name("done").data("{}"));
            emitter.complete();
        } catch (IOException e) {
            log.debug("[AI] cliente desconectado durante mock stream: {}", e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void sendError(SseEmitter emitter, String msg) {
        try {
            emitter.send(SseEmitter.event().name("error")
                .data(objectMapper.writeValueAsString(Map.of("error", msg))));
            emitter.complete();
        } catch (IOException e) {
            // Último intento de avisar al cliente también falló — ya no hay nada más
            // que hacer (cliente desconectado), pero queda visible a nivel debug.
            log.debug("[AI] no se pudo enviar evento de error por SSE: {}", e.getMessage());
        }
    }

    // ── Clasificador de intención ─────────────────────────────────────────────

    private enum Intent { VENTAS, INVENTARIO, CONTENIDO, OPERATIVO, GENERAL }

    private Intent detectIntent(String msg) {
        String lower = msg.toLowerCase();
        if (lower.matches(".*\\b(vend|ingres|factur|cobr|gananci|cuanto.*vendí|revenue|venta|compr.*client|client.*compr|mejor.*client).*")) return Intent.VENTAS;
        if (lower.matches(".*\\b(stock|inventari|bajo.*stock|precio|rebaj|oferta|actualiz.*product|catalog|producto).*")) return Intent.INVENTARIO;
        if (lower.matches(".*\\b(descri|instagram|whatsapp|post|redact|escrib|contenido|caption|anuncio|publicaci|seo|titul).*")) return Intent.CONTENIDO;
        if (lower.matches(".*\\b(pendiente|entreg|envi|pedido|orden|cliente.*espera|despachar|guia).*")) return Intent.OPERATIVO;
        return Intent.GENERAL;
    }

    // ── System prompt dinámico por intención ──────────────────────────────────

    private String buildSystemPrompt(Long empresaId, Intent intent) {
        String kpis   = getKpiContext(empresaId);
        String extra  = getDynamicData(empresaId, intent);

        String rolDescription = switch (intent) {
            case VENTAS     -> "Analizás ventas, ingresos y comportamiento de clientes. Identificás tendencias y oportunidades.";
            case INVENTARIO -> "Gestionás inventario y catálogo. Identificás productos con stock crítico y oportunidades de precio.";
            case CONTENIDO  -> "Generás contenido de venta persuasivo, optimizado para Costa Rica. Dominás el tono casual y efectivo del mercado local.";
            case OPERATIVO  -> "Revisás pedidos y operaciones. Priorizás por urgencia y ayudás a resolver cuellos de botella.";
            case GENERAL    -> "Asesorás sobre cualquier aspecto del negocio con base en los datos reales disponibles.";
        };

        return """
            Sos el Copilot de HOTCLICK, asistente de negocio para emprendedores costarricenses.
            Respondés en español con el vos costarricense. Sos directo, concreto y accionable.
            %s

            KPIs GENERALES DEL NEGOCIO:
            %s

            DATOS ESPECÍFICOS PARA ESTA CONSULTA:
            %s

            REGLAS:
            - Usá los datos inyectados arriba; nunca inventés cifras
            - Cuando generes contenido (posts, descripciones), sé persuasivo y natural, no corporativo
            - Si los datos muestran un problema, señalalo y proponé una acción concreta
            - Respondés solo sobre este negocio; si la pregunta es ajena, redirigís amablemente
            - Máximo 400 palabras por respuesta salvo que se pida contenido largo
            """.formatted(rolDescription, kpis, extra);
    }

    private String getDynamicData(Long empresaId, Intent intent) {
        try {
            return switch (intent) {
                case VENTAS     -> getVentasData(empresaId);
                case INVENTARIO -> getInventarioData(empresaId);
                case CONTENIDO  -> getCatalogoData(empresaId);
                case OPERATIVO  -> getPedidosPendientesData(empresaId);
                case GENERAL    -> "";
            };
        } catch (DataAccessException e) {
            log.warn("[AI-Copilot] empresaId={} intent={} datos no disponibles: {}", empresaId, intent, e.getMessage());
            return "- Datos específicos no disponibles en este momento";
        }
    }

    private String getVentasData(Long empresaId) {
        String sqlHoy = """
            SELECT COUNT(*) as pedidos, COALESCE(SUM(total_pedido),0) as ingresos
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND DATE(fecha_pedido) = CURRENT_DATE
              AND estado_pedido IN ('PAGADO','ENTREGADO')
            """;
        String sql30d = """
            SELECT COUNT(*) as pedidos, COALESCE(SUM(total_pedido),0) as ingresos
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND fecha_pedido >= NOW() - INTERVAL '30 days'
              AND estado_pedido IN ('PAGADO','ENTREGADO')
            """;
        String sqlTopProds = """
            SELECT p.nombre_producto, SUM(pi.cantidad) as veces, SUM(pi.subtotal_item) as total
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb ped ON pi.fk_id_pedido = ped.id_pedido
            JOIN hot_click_producto_tb p ON pi.fk_id_producto = p.id_producto
            WHERE ped.fk_id_empresa = ? AND ped.fecha_pedido >= NOW() - INTERVAL '30 days'
              AND ped.estado_pedido IN ('PAGADO','ENTREGADO')
            GROUP BY p.nombre_producto ORDER BY veces DESC LIMIT 5
            """;
        var hoy  = jdbc.queryForMap(sqlHoy,  empresaId);
        var m30  = jdbc.queryForMap(sql30d, empresaId);
        var top  = jdbc.queryForList(sqlTopProds, empresaId);
        java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Hoy: %s pedidos / ₡%s ingresos%n",
            hoy.get("pedidos"), fmt.format(hoy.get("ingresos"))));
        sb.append(String.format("Últimos 30 días: %s pedidos / ₡%s ingresos%n",
            m30.get("pedidos"), fmt.format(m30.get("ingresos"))));
        if (!top.isEmpty()) {
            sb.append("Top productos más vendidos (30d):\n");
            top.forEach(p -> sb.append(String.format("  - %s: %s ventas / ₡%s%n",
                p.get("nombre_producto"), p.get("veces"), fmt.format(p.get("total")))));
        }
        sb.append(getProductosSinVentaData(empresaId));
        sb.append(getClientesPorProductoData(empresaId));
        return sb.toString();
    }

    /** Productos activos sin ventas en 60+ días — reutiliza el cálculo de InventoryForecastService (F21). */
    private String getProductosSinVentaData(Long empresaId) {
        var lentos = inventoryForecastService.productosLentosMovimiento(empresaId);
        if (lentos.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("\nProductos sin ventas recientes (60+ días):\n");
        lentos.stream().limit(8).forEach(p -> sb.append(String.format("  - %s: stock %s, última venta hace %s%n",
            p.get("nombre_producto"), p.get("stock_actual"), diasDesde(p.get("fecha_ultima_venta")))));
        return sb.toString();
    }

    private String diasDesde(Object fecha) {
        LocalDateTime momento;
        if (fecha instanceof java.sql.Timestamp ts)   momento = ts.toLocalDateTime();
        else if (fecha instanceof LocalDateTime ldt)   momento = ldt;
        else return "nunca registrada";
        return ChronoUnit.DAYS.between(momento, LocalDateTime.now(Constants.ZONA_CR)) + " días";
    }

    /** Top 3 clientes por cada uno de los productos más vendidos (90d) — responde "quién me compra tal producto". */
    private String getClientesPorProductoData(Long empresaId) {
        String sql = """
            WITH ventas AS (
                SELECT p.nombre_producto, u.nombre AS nombre_usuario,
                       COUNT(*) AS veces,
                       ROW_NUMBER() OVER (PARTITION BY p.nombre_producto ORDER BY COUNT(*) DESC) AS rn
                FROM hot_click_pedido_item_tb pi
                JOIN hot_click_pedido_tb ped ON pi.fk_id_pedido = ped.id_pedido
                JOIN hot_click_producto_tb p ON pi.fk_id_producto = p.id_producto
                LEFT JOIN hot_click_usuario_tb u ON ped.fk_id_usuario_final = u.id_usuario
                WHERE ped.fk_id_empresa = ? AND ped.fecha_pedido >= NOW() - INTERVAL '90 days'
                  AND ped.estado_pedido IN ('PAGADO','ENTREGADO')
                GROUP BY p.nombre_producto, u.nombre, u.id_usuario
            ),
            top_productos AS (
                SELECT nombre_producto, SUM(veces) AS total_veces
                FROM ventas GROUP BY nombre_producto ORDER BY total_veces DESC LIMIT 6
            )
            SELECT v.nombre_producto, v.nombre_usuario, v.veces
            FROM ventas v
            JOIN top_productos tp ON tp.nombre_producto = v.nombre_producto
            WHERE v.rn <= 3
            ORDER BY tp.total_veces DESC, v.nombre_producto, v.veces DESC
            """;
        var filas = jdbc.queryForList(sql, empresaId);
        if (filas.isEmpty()) return "";

        StringBuilder sb = new StringBuilder("\nClientes recurrentes por producto (90d):\n");
        String productoActual = null;
        for (var f : filas) {
            String nombreProducto = (String) f.get("nombre_producto");
            if (!nombreProducto.equals(productoActual)) {
                sb.append(String.format("  %s:%n", nombreProducto));
                productoActual = nombreProducto;
            }
            Object cliente = f.get("nombre_usuario");
            sb.append(String.format("    - %s (%s compras)%n",
                cliente != null ? cliente : "Cliente sin cuenta", f.get("veces")));
        }
        return sb.toString();
    }

    private String getInventarioData(Long empresaId) {
        String sqlBajo = """
            SELECT nombre_producto, stock_actual, stock_minimo, precio_venta, precio_oferta
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1 AND visible_catalogo = TRUE AND vendido = FALSE
              AND stock_actual <= COALESCE(stock_minimo, 3)
            ORDER BY stock_actual ASC LIMIT 10
            """;
        String sqlTotal = """
            SELECT COUNT(*) as total, SUM(stock_actual) as unidades
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1 AND visible_catalogo = TRUE AND vendido = FALSE
            """;
        var bajo  = jdbc.queryForList(sqlBajo, empresaId);
        var total = jdbc.queryForMap(sqlTotal, empresaId);
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Catálogo activo: %s productos / %s unidades en stock%n",
            total.get("total"), total.get("unidades")));
        if (!bajo.isEmpty()) {
            sb.append("Productos con stock crítico:\n");
            bajo.forEach(p -> sb.append(String.format("  - %s: %s unidades (mínimo: %s) — ₡%s%n",
                p.get("nombre_producto"), p.get("stock_actual"),
                p.get("stock_minimo"), p.get("precio_venta"))));
        } else {
            sb.append("No hay productos con stock crítico.\n");
        }
        return sb.toString();
    }

    private String getCatalogoData(Long empresaId) {
        String sql = """
            SELECT nombre_producto, descripcion_corta, precio_venta, precio_oferta,
                   stock_actual, tags
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1
              AND visible_catalogo = TRUE AND vendido = FALSE AND stock_actual > 0
            ORDER BY id_producto DESC LIMIT 20
            """;
        var prods = jdbc.queryForList(sql, empresaId);
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Catálogo disponible (%d productos):%n", prods.size()));
        prods.forEach(p -> {
            String oferta = p.get("precio_oferta") != null ? " (oferta: ₡" + p.get("precio_oferta") + ")" : "";
            sb.append(String.format("  - %s — ₡%s%s | Stock: %s%n",
                p.get("nombre_producto"), p.get("precio_venta"), oferta, p.get("stock_actual")));
            if (p.get("descripcion_corta") != null && !p.get("descripcion_corta").toString().isBlank()) {
                sb.append(String.format("    Desc: %s%n", p.get("descripcion_corta")));
            }
        });
        return sb.toString();
    }

    private String getPedidosPendientesData(Long empresaId) {
        // Solo el nombre — el email es PII innecesaria para que el LLM
        // aconseje sobre despachos y no debe salir hacia la API de NVIDIA.
        String sql = """
            SELECT p.id_pedido, p.estado_pedido, p.total_pedido, p.fecha_pedido,
                   u.nombre AS nombre_usuario
            FROM hot_click_pedido_tb p
            LEFT JOIN hot_click_usuario_tb u ON p.fk_id_usuario_final = u.id_usuario
            WHERE p.fk_id_empresa = ?
              AND p.estado_pedido IN ('PAGADO','PROCESANDO','PREPARANDO')
            ORDER BY p.fecha_pedido ASC LIMIT 15
            """;
        var pedidos = jdbc.queryForList(sql, empresaId);
        if (pedidos.isEmpty()) return "No hay pedidos pendientes en este momento.\n";
        java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("%d pedidos pendientes de despachar:%n", pedidos.size()));
        pedidos.forEach(p -> sb.append(String.format("  #%s [%s] ₡%s — %s%n",
            p.get("id_pedido"), p.get("estado_pedido"),
            fmt.format(p.get("total_pedido")),
            p.get("nombre_usuario"))));
        return sb.toString();
    }

    private String getKpiContext(Long empresaId) {
        try {
            String sqlKpis = """
                SELECT COUNT(*) as pedidos_7d,
                       COALESCE(SUM(total_pedido),0) as ingresos_7d
                FROM hot_click_pedido_tb
                WHERE fk_id_empresa = ? AND fecha_pedido >= NOW() - INTERVAL '7 days'
                  AND estado_pedido IN ('PAGADO','ENTREGADO')
                """;
            Map<String, Object> kpis = jdbc.queryForMap(sqlKpis, empresaId);
            java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
            return String.format("Pedidos últimos 7 días: %s | Ingresos: ₡%s",
                kpis.get("pedidos_7d"), fmt.format(kpis.get("ingresos_7d")));
        } catch (DataAccessException e) {
            log.warn("[AI] empresaId={} KPI no disponible: {}", empresaId, e.getMessage());
            return "Datos no disponibles";
        }
    }

    private List<Map<String, Object>> buildMessages(Long empresaId, String userMessage) {
        List<Map<String, Object>> history = aiMensajeRepository
            .findByEmpresaIdOrderByFechaCreacionAsc(empresaId, PageRequest.of(0, HISTORY_TURNS))
            .stream().map(m -> {
                String content = m.getContenido();
                return Map.<String, Object>of("role", m.getRol(), "content", content != null ? content : "");
            })
            .collect(java.util.stream.Collectors.toCollection(ArrayList::new));

        history.add(Map.of("role", "user", "content", userMessage));
        return history;
    }

    private String buildRequestBody(String systemPrompt, List<Map<String, Object>> messages, Long tenantId) {
        return buildRequestBody(systemPrompt, messages, tenantId, true);
    }

    private String buildRequestBody(String systemPrompt, List<Map<String, Object>> messages, Long tenantId, boolean stream) {
        try {
            // Formato OpenAI chat completions: el system prompt va como mensaje, no como
            // campo top-level separado (a diferencia de la Messages API de Claude).
            List<Map<String, Object>> chatMessages = new ArrayList<>();
            chatMessages.add(Map.of("role", "system", "content", systemPrompt));
            chatMessages.addAll(messages);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model",      model);
            body.put("max_tokens", 1024);
            body.put("stream",     stream);
            if (stream) body.put("stream_options", Map.of("include_usage", true));
            body.put("messages",   chatMessages);
            // Stop sequences prevent prompt injection: if a reply tries to impersonate
            // "Human:" or "User:", NVIDIA stops immediately instead of continuing the loop.
            body.put("stop", List.of("\n\nHuman:", "\n\nUser:", "Human:", "User:"));
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new IntegracionExternaException("nvidia-api", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                tenantId, "No se pudo serializar el request a NVIDIA API", e);
        }
    }

    // ── Tool-calling real (solo chatSync / bot de Telegram) ────────────────────
    //
    // A diferencia de chatStream (panel admin), que sigue con el patrón de
    // inyectar un bloque de datos fijo según intención detectada por regex,
    // chatSync expone herramientas reales (tools) que el modelo NVIDIA decide
    // cuándo invocar — confirmado que meta/llama-3.1-70b-instruct soporta el
    // mismo formato de function-calling que OpenAI (ver memoria del proyecto).
    // chatStream no se toca: mismo comportamiento de siempre para el panel.

    private String buildSystemPromptConTools(Long empresaId, Empresa empresa, String nombreUsuario) {
        String nombreNegocio = empresa != null && empresa.getNombreComercial() != null && !empresa.getNombreComercial().isBlank()
            ? empresa.getNombreComercial()
            : (empresa != null && empresa.getNombreEmpresa() != null ? empresa.getNombreEmpresa() : "tu negocio");
        String kpis = getKpiContext(empresaId);
        String saludo = nombreUsuario != null && !nombreUsuario.isBlank()
            ? "Le hablás a " + nombreUsuario.trim() + ", dueño/a o encargado/a del negocio."
            : "";

        return """
            Sos el Copilot de HOTCLICK, el asistente de negocio de "%s". Respondés en
            español con el vos costarricense: directo, concreto y accionable. %s

            Tenés herramientas para consultar datos reales del negocio (inventario,
            ventas, finanzas, clientes, recomendaciones) — llamalas SOLO cuando la
            pregunta realmente las necesite, nunca para inventar cifras. Si el dato
            ya está en la conversación previa, no repitas la misma consulta.

            ESTILO DE RESPUESTA (muy importante, seguilo siempre):
            - Respondé EXACTAMENTE lo que se te pregunta, ni más ni menos. Un saludo
              ("hola", "buenas", "qué tal") se responde con un saludo corto y una
              pregunta de qué necesita — nunca dispares un reporte del negocio sin
              que te lo pidan.
            - Por defecto sé breve: 2 a 4 líneas alcanza para la mayoría de
              preguntas puntuales. Solo das una lista larga, tabla o desglose
              completo si te piden explícitamente un resumen, reporte, o "todo".
            - No llamés una herramienta si la pregunta no la necesita (un saludo
              o una pregunta general de negocio no ameritan consultar datos).

            KPIs GENERALES (últimos 7 días, contexto tuyo — no los repitas salvo que pregunten):
            %s

            REGLAS:
            - Nunca inventés cifras: si no tenés el dato, usá la herramienta correspondiente
            - Respondés solo sobre este negocio; si la pregunta es ajena, redirigís amablemente
            """.formatted(nombreNegocio, saludo, kpis);
    }

    private List<Map<String, Object>> buildTools(Long empresaId) {
        List<Map<String, Object>> tools = new ArrayList<>();
        tools.add(toolDef("consultar_inventario",
            "Consulta el estado del catálogo: cuántos productos activos y unidades en stock hay, y cuáles productos tienen stock crítico (bajo el mínimo).",
            Map.of("type", "object", "properties", Map.of())));
        tools.add(toolDef("consultar_ventas",
            "Consulta ventas: pedidos e ingresos de hoy y de los últimos 30 días, productos más vendidos, productos sin ventas recientes, y clientes recurrentes por producto.",
            Map.of("type", "object", "properties", Map.of())));
        tools.add(toolDef("recomendaciones",
            "Devuelve acciones recomendadas para el negocio: productos con stock crítico a reabastecer, y productos sin ventas en 60+ días candidatos a descuento.",
            Map.of("type", "object", "properties", Map.of())));
        tools.add(toolDef("consultar_clientes",
            "Consulta la lista de clientes del negocio: cuántos son y sus nombres. Usar cuando pregunten cuáles/cuántos son sus clientes.",
            Map.of("type", "object", "properties", Map.of())));

        if (tieneFeatureReportes(empresaId)) {
            tools.add(toolDef("consultar_finanzas",
                "Consulta KPIs financieros del negocio para un período: ventas totales, costo de mercadería vendida (CMV), ganancia neta, margen, IVA.",
                Map.of("type", "object",
                    "properties", Map.of("periodo", Map.of(
                        "type", "string",
                        "enum", List.of("hoy", "semana", "mes", "todo"),
                        "description", "Período a consultar — por defecto 'mes' (mes actual)")),
                    "required", List.of())));
        }
        return tools;
    }

    /** Verifica el feature "reportes" sin depender del TenantContext ambiente — el webhook de Telegram es público y no lo setea. */
    private boolean tieneFeatureReportes(Long empresaId) {
        Long previo = TenantContext.get();
        try {
            TenantContext.set(empresaId);
            return tenantService.tieneFeature("reportes");
        } finally {
            if (previo != null) TenantContext.set(previo); else TenantContext.clear();
        }
    }

    /** Formato de tool de la Messages API de Claude — plano, sin la envoltura {type:"function", function:{...}} de OpenAI. */
    private Map<String, Object> toolDef(String name, String description, Map<String, Object> parameters) {
        Map<String, Object> tool = new LinkedHashMap<>();
        tool.put("name", name);
        tool.put("description", description);
        tool.put("input_schema", parameters);
        return tool;
    }

    private String ejecutarTool(Long empresaId, String nombre, JsonNode args) {
        try {
            return switch (nombre) {
                case "consultar_inventario" -> getInventarioData(empresaId);
                case "consultar_ventas"     -> getVentasData(empresaId);
                case "recomendaciones"      -> getRecomendacionesData(empresaId);
                case "consultar_clientes"   -> getClientesData(empresaId);
                case "consultar_finanzas"   -> getFinanzasData(empresaId, args);
                default -> "Herramienta desconocida: " + nombre;
            };
        } catch (DataAccessException e) {
            log.warn("[AI-tool] empresaId={} tool={} datos no disponibles: {}", empresaId, nombre, e.getMessage());
            return "No se pudo obtener el dato en este momento.";
        }
    }

    private String getRecomendacionesData(Long empresaId) {
        StringBuilder sb = new StringBuilder();
        var enRiesgo = inventoryForecastService.productosEnRiesgo(empresaId);
        if (!enRiesgo.isEmpty()) {
            sb.append("Productos con stock en riesgo (reabastecer pronto):\n");
            enRiesgo.stream().limit(8).forEach(p -> sb.append(String.format("  - %s: stock %s (mínimo %s)%n",
                p.get("nombre_producto"), p.get("stock_actual"), p.get("stock_minimo"))));
        }
        var lentos = getProductosSinVentaAccionables(empresaId);
        if (!lentos.isEmpty()) {
            sb.append("\nProductos candidatos a descuento (sin ventas en 60+ días):\n");
            lentos.forEach(p -> sb.append(String.format("  - %s: stock %s, sin venta hace %s, descuento sugerido %s%%%n",
                p.get("nombre"), p.get("stock"), p.get("diasSinVenta"), p.get("descuentoSugeridoPct"))));
        }
        if (sb.isEmpty()) {
            sb.append("No hay recomendaciones urgentes en este momento — el negocio está en buen estado.");
        }
        return sb.toString();
    }

    /** Lista de clientes del negocio (compraron al menos una vez, o se registraron con esta empresa). */
    private String getClientesData(Long empresaId) {
        List<Usuario> clientes = usuarioRepository.findClientesByEmpresa(empresaId);
        if (clientes.isEmpty()) return "Todavía no hay clientes registrados en este negocio.";

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Tenés %d cliente%s:%n", clientes.size(), clientes.size() == 1 ? "" : "s"));
        clientes.stream().limit(20).forEach(c -> sb.append("  - ")
            .append(c.getNombre() != null && !c.getNombre().isBlank() ? c.getNombre() : "Cliente sin nombre")
            .append("\n"));
        if (clientes.size() > 20) sb.append("  ... y ").append(clientes.size() - 20).append(" más\n");
        return sb.toString();
    }

    private String getFinanzasData(Long empresaId, JsonNode args) {
        String periodo = args != null && args.hasNonNull("periodo") ? args.get("periodo").asText() : "mes";
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        String desde = switch (periodo) {
            case "hoy"    -> hoy.toString();
            case "semana" -> hoy.minusDays(7).toString();
            case "todo"   -> null;
            default       -> hoy.withDayOfMonth(1).toString(); // "mes"
        };

        Map<String, Object> kpis = finanzasReporteService.calcularKpis(empresaId, desde, null);
        java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
        return """
            Período: %s
            Ventas: %s / ₡%s
            Costo de mercadería vendida (CMV): ₡%s
            Costo de envío: ₡%s
            Ganancia neta: ₡%s (margen %s%%)
            IVA recaudado: ₡%s | IVA estimado: ₡%s
            Compras a proveedor recibidas en el período: ₡%s
            """.formatted(periodo, kpis.get("cantidadVentas"), fmt.format(kpis.get("ventasTotales")),
                fmt.format(kpis.get("cmv")), fmt.format(kpis.get("costoEnvio")),
                fmt.format(kpis.get("gananciaNeta")), kpis.get("margenPct"),
                fmt.format(kpis.get("ivaRecaudado")), fmt.format(kpis.get("ivaEstimado")),
                fmt.format(kpis.get("comprasRecibidas")));
    }

    /**
     * Request para la Messages API de Claude — a diferencia de OpenAI/NVIDIA, el
     * system prompt va en un campo top-level, no como mensaje con role "system".
     */
    private String buildRequestBodyClaude(String systemPrompt, List<Map<String, Object>> messages,
                                          List<Map<String, Object>> tools) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model",      claudeModel);
            body.put("max_tokens", 1024);
            body.put("system",     systemPrompt);
            body.put("messages",   messages);
            if (!tools.isEmpty()) {
                body.put("tools", tools);
            }
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new IntegracionExternaException("claude-api", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                "No se pudo serializar el request a Claude API", e);
        }
    }

    @Transactional
    protected void saveMsg(Empresa empresa, String rol, String contenido, int tokens) {
        if (empresa == null || contenido == null || contenido.isBlank()) return;
        AiMensaje msg = new AiMensaje();
        msg.setEmpresa(empresa);
        msg.setRol(rol);
        msg.setContenido(contenido);
        msg.setTokens(tokens);
        aiMensajeRepository.save(msg);
    }
}
