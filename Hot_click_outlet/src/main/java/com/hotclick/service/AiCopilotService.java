package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import com.hotclick.model.AiMensaje;
import com.hotclick.model.Empresa;
import com.hotclick.repository.AiMensajeRepository;
import com.hotclick.repository.EmpresaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

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
        // Reserva slot atómicamente antes del HTTP call — elimina race condition TOCTOU
        if (!aiQuotaService.verificarYReservar(empresaId)) {
            try {
                emitter.send(SseEmitter.event().name("error")
                    .data("{\"error\":\"Cuota mensual de AI agotada. Actualiza tu plan.\"}"));
                emitter.complete();
            } catch (Exception ignored) {}
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

        // Build messages array for Claude
        List<Map<String, Object>> messages = buildMessages(empresaId, userMessage);
        String systemPrompt = buildSystemPrompt(empresaId);
        String requestBody  = buildRequestBody(systemPrompt, messages);

        try {
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
                    log.error("[AI] Stream error empresa={}: {}", empresaId, ex.getMessage());
                    sendError(emitter, "Error de conexión con el AI: " + ex.getMessage());
                    return null;
                });
        } catch (Exception e) {
            log.error("[AI] Build request error: {}", e.getMessage());
            sendError(emitter, "Error interno del AI");
        }
    }

    private void chatStreamFallback(Long empresaId, String userMessage, SseEmitter emitter, Throwable t) {
        log.error("[claude-circuit] OPEN empresaId={}: {}", empresaId, t.getMessage());
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
                                emitter.send(SseEmitter.event().name("delta")
                                    .data(objectMapper.writeValueAsString(Map.of("text", text))));
                            }
                        } else if ("message_delta".equals(type)) {
                            tokenCount[1] = node.path("usage").path("output_tokens").asInt(0);
                        } else if ("message_start".equals(type)) {
                            tokenCount[0] = node.path("message").path("usage").path("input_tokens").asInt(0);
                        }
                    } catch (Exception ignored) {}
                }
            });

            emitter.send(SseEmitter.event().name("done").data("{}"));
            emitter.complete();

            // Save assistant reply + actualiza solo tokens (llamadas ya fue incrementado antes del call)
            saveMsg(empresa, "assistant", fullText.toString(), tokenCount[1]);
            aiQuotaService.actualizarTokens(empresaId, tokenCount[0], tokenCount[1]);

        } catch (Exception e) {
            log.error("[AI] Processing stream error: {}", e.getMessage());
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
        } catch (Exception ignored) {}
    }

    private void sendError(SseEmitter emitter, String msg) {
        try {
            emitter.send(SseEmitter.event().name("error")
                .data(objectMapper.writeValueAsString(Map.of("error", msg))));
            emitter.complete();
        } catch (Exception ignored) {}
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
        } catch (Exception e) {
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

    private String buildRequestBody(String systemPrompt, List<Map<String, Object>> messages) {
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
        } catch (Exception e) {
            throw new RuntimeException("Error building AI request", e);
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
