package com.hotclick.service.copilot;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.exception.IntegracionExternaException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiCopilotClaudeClient {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotClaudeClient.class);
    private static final int    MAX_TOOL_ROUNDS    = 4;      // tope de idas-y-vueltas tool-calling — evita loops infinitos
    private static final long   TOOL_LOOP_BUDGET_MS = 40_000; // presupuesto total del loop — NVIDIA es intermitentemente lenta
    private static final String CLAUDE_URL = "https://api.anthropic.com/v1/messages";
    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    @Value("${anthropic.api-key:}")
    private String claudeApiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String claudeModel;

    @Autowired private ObjectMapper objectMapper;
    @Autowired private AiCopilotToolExecutor toolExecutor;

    public record ResultadoLoopClaude(String texto, int tokensIn, int tokensOut, AccionPropuestaTelegram accionPropuesta) {}

    /**
     * Loop compartido de tool-calling de Claude — usado por chatSync y chatSyncConAcciones.
     * Retorna {@code null} cuando el proveedor falló (timeout agotado, HTTP no-2xx): el
     * caller decide su propio fallback, igual que antes de este refactor.
     */
    public ResultadoLoopClaude ejecutarLoopClaude(Long empresaId, String systemPrompt,
            List<Map<String, Object>> messages, List<Map<String, Object>> tools)
            throws IOException, InterruptedException {
        int tokensInTotal = 0, tokensOutTotal = 0;
        String texto = null;
        // Como máximo una propuesta de acción por turno, aunque el modelo dispare
        // varias tools de propuesta en paralelo en la misma ronda — defensa en código,
        // no solo instrucción del prompt.
        AccionPropuestaTelegram[] accionHolder = new AccionPropuestaTelegram[1];
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
                    String resultado = toolExecutor.ejecutarTool(empresaId, toolName, block.path("input"), accionHolder);
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

        return new ResultadoLoopClaude(texto, tokensInTotal, tokensOutTotal, accionHolder[0]);
    }

    /**
     * Request para la Messages API de Claude — a diferencia de OpenAI/NVIDIA, el
     * system prompt va en un campo top-level, no como mensaje con role "system".
     */
    String buildRequestBodyClaude(String systemPrompt, List<Map<String, Object>> messages,
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
}
