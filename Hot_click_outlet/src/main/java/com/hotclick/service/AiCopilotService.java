package com.hotclick.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.model.AiMensaje;
import com.hotclick.model.Empresa;
import com.hotclick.repository.AiMensajeRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.TenantContext;
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
import java.util.*;
import java.util.concurrent.CompletionException;

/**
 * AI Copilot powered by Claude API.
 *
 * Uses Java 21 HttpClient — no external SDK required.
 * Streams the response via SSE to avoid connection timeouts.
 * When api-key is blank, returns a mock response (dev mode).
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
    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String model;

    @Autowired private AiMensajeRepository aiMensajeRepository;
    @Autowired private AiQuotaService      aiQuotaService;
    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ObjectMapper        objectMapper;
    @Autowired private JdbcTemplate        jdbc;

    // ── Public API ────────────────────────────────────────────────────────────

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
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
     * Main streaming endpoint.
     * Saves the user message, streams Claude's reply via SSE,
     * then saves the assistant message and updates quota.
     */
    @CircuitBreaker(name = "claude", fallbackMethod = "chatStreamFallback")
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
            streamMock(emitter, "*(modo desarrollo — configura ANTHROPIC_API_KEY para respuestas reales)*\n\nHola, soy tu copilot de HOTCLICK. ¿En qué te puedo ayudar con tu negocio?");
            saveMsg(empresa, "assistant", "Mock response", 0);
            return;
        }

        try {
            // Build messages array for Claude
            List<Map<String, Object>> messages = buildMessages(empresaId, userMessage);
            String systemPrompt = buildSystemPrompt(empresaId);
            String requestBody  = buildRequestBody(systemPrompt, messages, tenantId);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.anthropic.com/v1/messages"))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                .build();

            HTTP.sendAsync(request, HttpResponse.BodyHandlers.ofLines())
                .thenAccept(response -> processStream(response, emitter, empresa, empresaId))
                .exceptionally(ex -> {
                    reportClaudeFailure(unwrap(ex), tenantId, emitter);
                    return null;
                });
        } catch (IntegracionExternaException e) {
            reportClaudeFailure(e, tenantId, emitter);
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
    private void reportClaudeFailure(Throwable cause, Long tenantId, SseEmitter emitter) {
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
                "claude-api", tipo, tenantId, "Fallo llamando a Claude API", cause);
        }

        log.error("[AI] tenantId={} integracion={} tipo={} msg={}",
            tenantId, integrationEx.getIntegracion(), integrationEx.getTipo(), integrationEx.getMessage(), integrationEx);

        // Mensaje genérico al cliente — nunca se expone el detalle interno de la excepción.
        sendError(emitter, "El asistente AI no está disponible temporalmente. Intenta de nuevo en unos minutos.");
    }

    private void chatStreamFallback(Long empresaId, String userMessage, SseEmitter emitter, Throwable t) {
        Long tenantId = TenantContext.get();
        IntegracionExternaException integrationEx = new IntegracionExternaException(
            "claude-api", IntegracionExternaException.Tipo.RATE_LIMIT, tenantId,
            "Circuit breaker abierto para Claude API", t);
        log.error("[claude-circuit] OPEN tenantId={} msg={}", tenantId, integrationEx.getMessage(), integrationEx);
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
                        String type = node.path("type").asText();

                        if ("content_block_delta".equals(type)) {
                            String text = node.path("delta").path("text").asText();
                            if (!text.isEmpty()) {
                                // Hard cap: kill stream if response grows unreasonably large (loop guard)
                                if (fullText.length() >= MAX_RESPONSE_CHARS) return;
                                fullText.append(text);
                                try {
                                    emitter.send(SseEmitter.event().name("delta")
                                        .data(objectMapper.writeValueAsString(Map.of("text", text))));
                                } catch (IOException e) {
                                    // Cliente cerró la pestaña/conexión a mitad del stream — esperado, no es
                                    // un fallo de la integración con Claude. No se loguea como error.
                                    log.debug("[AI] empresaId={} cliente desconectado durante stream: {}", empresaId, e.getMessage());
                                }
                            }
                        } else if ("message_delta".equals(type)) {
                            tokenCount[1] = node.path("usage").path("output_tokens").asInt(0);
                        } else if ("message_start".equals(type)) {
                            tokenCount[0] = node.path("message").path("usage").path("input_tokens").asInt(0);
                        }
                    } catch (JsonProcessingException e) {
                        // Un chunk SSE individual de Claude vino malformado — se descarta ese chunk
                        // y se sigue con el stream, pero queda visible si el payload de Claude cambió.
                        log.warn("[AI] empresaId={} chunk SSE de Claude no se pudo parsear: {}", empresaId, e.getMessage());
                    }
                }
            });

            emitter.send(SseEmitter.event().name("done").data("{}"));
            emitter.complete();

            // Save assistant reply + actualiza solo tokens (llamadas ya fue incrementado antes del call)
            saveMsg(empresa, "assistant", fullText.toString(), tokenCount[1]);
            aiQuotaService.actualizarTokens(empresaId, tokenCount[0], tokenCount[1]);

        } catch (IOException e) {
            log.error("[AI] empresaId={} error de E/S procesando stream de Claude: {}", empresaId, e.getMessage(), e);
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

    private String buildSystemPrompt(Long empresaId) {
        String kpis = getKpiContext(empresaId);
        return """
            Eres el Copilot de HOTCLICK, asistente de negocio para emprendedores costarricenses.
            Respondes en español, de forma concisa y accionable. Usas datos reales del negocio.

            CONTEXTO DEL NEGOCIO:
            %s

            Ayudas con: análisis de ventas, gestión de inventario, estrategias de marketing,
            interpretación de reportes, y optimización del negocio. No ejecutas acciones,
            solo analizas y recomiendas. Si no tienes datos suficientes, lo dices.
            """.formatted(kpis);
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

            String sqlProductos = """
                SELECT nombre_producto, stock_actual, stock_minimo
                FROM hot_click_producto_tb
                WHERE fk_id_empresa = ? AND fk_id_estado = 1
                  AND visible_catalogo = TRUE AND vendido = FALSE
                  AND stock_actual <= stock_minimo
                ORDER BY stock_actual ASC LIMIT 5
                """;
            List<Map<String, Object>> bajoStock = jdbc.queryForList(sqlProductos, empresaId);

            StringBuilder sb = new StringBuilder();
            sb.append(String.format("- Pedidos últimos 7 días: %s\n", kpis.get("pedidos_7d")));
            sb.append(String.format("- Ingresos últimos 7 días: ₡%s\n",
                new java.text.DecimalFormat("#,###").format(kpis.get("ingresos_7d"))));
            if (!bajoStock.isEmpty()) {
                sb.append("- Productos con stock bajo: ");
                bajoStock.forEach(p -> sb.append(p.get("nombre_producto")).append(
                    " (stock: ").append(p.get("stock_actual")).append("), "));
            }
            return sb.toString();
        } catch (DataAccessException e) {
            // Degradación intencional: el copilot puede responder sin KPIs si la
            // consulta falla, pero el fallo en sí debe quedar visible — antes se
            // perdía por completo y un problema de esquema/conexión pasaba desapercibido.
            log.warn("[AI] empresaId={} no se pudo obtener contexto KPI: {}", empresaId, e.getMessage());
            return "- Datos no disponibles";
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
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model",      model);
            body.put("max_tokens", 1024);
            body.put("stream",     true);
            body.put("system",     systemPrompt);
            body.put("messages",   messages);
            // Stop sequences prevent prompt injection: if a reply tries to impersonate
            // "Human:" or "User:", Claude stops immediately instead of continuing the loop.
            body.put("stop_sequences", List.of("\n\nHuman:", "\n\nUser:", "Human:", "User:"));
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new IntegracionExternaException("claude-api", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                tenantId, "No se pudo serializar el request a Claude API", e);
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
