package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.model.AiMensaje;
import com.hotclick.model.Empresa;
import com.hotclick.repository.AiMensajeRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.copilot.AiCopilotClaudeClient;
import com.hotclick.service.copilot.AiCopilotContextBuilder;
import com.hotclick.service.copilot.AiCopilotRequestBuilder;
import com.hotclick.service.copilot.AiCopilotStreamProcessor;
import com.hotclick.service.copilot.AiCopilotSuggestionsService;
import com.hotclick.service.copilot.AiCopilotToolExecutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
    private static final int    MAX_RESPONSE_CHARS = 8_000;  // hard cap — stops runaway stream output loops
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

    // ── Claude (Anthropic) — motor del chat del bot de Telegram ────────────────
    private static final String CLAUDE_URL = "https://api.anthropic.com/v1/messages";

    @Value("${anthropic.api-key:}")
    private String claudeApiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String claudeModel;

    @Autowired private AiMensajeRepository          aiMensajeRepository;
    @Autowired private AiQuotaService               aiQuotaService;
    @Autowired private EmpresaRepository            empresaRepository;
    @Autowired private ObjectMapper                 objectMapper;
    @Autowired private JdbcTemplate                 jdbc;
    @Autowired private AiCopilotContextBuilder      contextBuilder;
    @Autowired private AiCopilotToolExecutor        toolExecutor;
    @Autowired private AiCopilotClaudeClient        claudeClient;
    @Autowired private AiCopilotRequestBuilder      requestBuilder;
    @Autowired private AiCopilotStreamProcessor     streamProcessor;
    @Autowired private AiCopilotSuggestionsService  suggestionsService;

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

    /**
     * Productos sin ventas en 60+ días, con la acción que el Copilot puede sugerir
     * (aplicar descuento). Es solo lectura — la ejecución real pasa por el endpoint
     * existente PATCH /api/productos/{id}/oferta, que el dueño o ADMIN debe confirmar
     * explícitamente desde la UI. El Copilot nunca aplica cambios por sí mismo.
     */
    public List<Map<String, Object>> getProductosSinVentaAccionables(Long empresaId) {
        return contextBuilder.getProductosSinVentaAccionables(empresaId);
    }

    public List<String> getSugerencias(Long empresaId) {
        return suggestionsService.getSugerencias(empresaId);
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
            streamProcessor.sendError(emitter, "Cuota mensual de AI agotada. Actualiza tu plan.");
            return;
        }

        // Save user message
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        saveMsg(empresa, "user", userMessage, 0);

        if (!isEnabled()) {
            // Mock mode for development
            streamProcessor.streamMock(emitter, "*(modo desarrollo — configura NVIDIA_API_KEY para respuestas reales)*\n\nHola, soy tu copilot de HOTCLICK. ¿En qué te puedo ayudar con tu negocio?");
            saveMsg(empresa, "assistant", "Mock response", 0);
            return;
        }

        try {
            AiCopilotContextBuilder.Intent intent = contextBuilder.detectIntent(userMessage);

            // Build messages array para NVIDIA (formato OpenAI chat completions)
            List<Map<String, Object>> messages = requestBuilder.buildMessages(empresaId, userMessage);
            String systemPrompt = contextBuilder.buildSystemPrompt(empresaId, intent);
            String requestBody  = requestBuilder.buildRequestBody(systemPrompt, messages, tenantId);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(nvidiaUrl))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .header("Accept", "text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                .build();

            HTTP.sendAsync(request, HttpResponse.BodyHandlers.ofLines())
                .thenAccept(response -> streamProcessor.processStream(response, emitter, empresa, empresaId, this::saveMsg))
                .exceptionally(ex -> {
                    streamProcessor.reportNvidiaFailure(AiCopilotStreamProcessor.unwrap(ex), tenantId, emitter);
                    return null;
                });
        } catch (IntegracionExternaException e) {
            streamProcessor.reportNvidiaFailure(e, tenantId, emitter);
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
        ChatConAccionesResultado r = chatSyncInterno(empresaId, userMessage, nombreUsuario, false);
        return r != null ? r.texto() : null;
    }

    /**
     * Resultado de {@link #chatSyncConAcciones}: el texto de respuesta del modelo, y
     * — solo si el usuario pidió una mutación soportada y es propietario/admin — una
     * {@link AccionPropuestaTelegram} pendiente de confirmación explícita del usuario.
     * Nunca viene ya ejecutada: el caller (TelegramFlujoService) es el único que la
     * persiste y, tras el botón Confirmar, la ejecuta.
     */
    public record ChatConAccionesResultado(String texto, AccionPropuestaTelegram accionPropuesta) {}

    /**
     * Igual que {@link #chatSync}, pero cuando {@code puedeGestionar} es true expone
     * además herramientas de mutación (proponer_*) que el modelo puede usar para
     * proponer una acción — nunca para ejecutarla directamente (ver AccionPropuestaTelegram).
     */
    public ChatConAccionesResultado chatSyncConAcciones(Long empresaId, String userMessage,
                                                         String nombreUsuario, boolean puedeGestionar) {
        return chatSyncInterno(empresaId, userMessage, nombreUsuario, puedeGestionar);
    }

    private ChatConAccionesResultado chatSyncInterno(Long empresaId, String userMessage,
                                                       String nombreUsuario, boolean puedeGestionar) {
        if (!aiQuotaService.verificarYReservar(empresaId)) {
            return new ChatConAccionesResultado(
                "Se agotó la cuota mensual de consultas con IA de tu plan. Podés seguir usando los botones del menú (/menu), que no consumen cuota.",
                null);
        }

        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        saveMsg(empresa, "user", userMessage, 0);

        if (!isClaudeEnabled()) {
            String mock = "(modo desarrollo — configurá ANTHROPIC_API_KEY para respuestas reales)\n\nHola, soy tu copilot de HotClick. ¿En qué te ayudo con tu negocio?";
            saveMsg(empresa, "assistant", mock, 0);
            return new ChatConAccionesResultado(mock, null);
        }

        try {
            List<Map<String, Object>> messages = requestBuilder.buildMessages(empresaId, userMessage);
            String systemPrompt = toolExecutor.buildSystemPromptConTools(empresaId, empresa, nombreUsuario, puedeGestionar);
            List<Map<String, Object>> tools = toolExecutor.buildTools(empresaId, puedeGestionar);

            AiCopilotClaudeClient.ResultadoLoopClaude loop = claudeClient.ejecutarLoopClaude(empresaId, systemPrompt, messages, tools);
            if (loop == null) return null; // fallo de proveedor — el caller decide su fallback

            String texto = loop.texto();
            if (texto == null || texto.isBlank()) {
                texto = "No pude generar una respuesta. Probá reformular la pregunta.";
            }
            if (texto.length() > MAX_RESPONSE_CHARS) texto = texto.substring(0, MAX_RESPONSE_CHARS);

            saveMsg(empresa, "assistant", texto, loop.tokensOut());
            aiQuotaService.actualizarTokens(empresaId, loop.tokensIn(), loop.tokensOut());
            return new ChatConAccionesResultado(texto, loop.accionPropuesta());

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

    /** Resilience4j exige el fallback en la misma clase que {@link #chatStream}. */
    @SuppressWarnings("unused")
    private void chatStreamFallback(Long empresaId, String userMessage, SseEmitter emitter, Throwable t) {
        streamProcessor.chatStreamFallback(empresaId, userMessage, emitter, t);
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
