package com.hotclick.service.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.AccionPropuestaTelegram;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Rondas del loop tool-calling de Claude — extraído bit-idéntico de {@link AiCopilotClaudeClient}.
 */
@Component
class AiCopilotClaudeLoopHelper {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotClaudeLoopHelper.class);

    @Autowired private ObjectMapper objectMapper;
    @Autowired private AiCopilotToolExecutor toolExecutor;
    @Autowired private AiCopilotClaudeRequestSender requestSender;

    /** @return null si el caller debe abortar el loop (HTTP fallido). */
    HttpResponse<String> enviarRonda(Long empresaId, int ronda, long deadline,
            String requestBody) throws IOException, InterruptedException {
        if (System.currentTimeMillis() >= deadline) {
            log.warn("[AI-sync] empresaId={} se acabó el presupuesto de tiempo de Claude (ronda {})", empresaId, ronda);
            return null;
        }
        HttpResponse<String> response = requestSender.enviar(requestBody);
        if (response == null) {
            if (System.currentTimeMillis() >= deadline) {
                log.warn("[AI-sync] empresaId={} timeout en ronda {} y sin presupuesto para reintentar", empresaId, ronda);
                return null;
            }
            log.warn("[AI-sync] empresaId={} timeout en ronda {} — reintentando una vez", empresaId, ronda);
            response = requestSender.enviar(requestBody);
        }
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.error("[AI-sync] empresaId={} Claude respondió {} — {}", empresaId, response.statusCode(), response.body());
            return null;
        }
        return response;
    }

    /** @return true si hubo tool_use y el loop debe continuar. */
    boolean procesarToolUse(Long empresaId, JsonNode content, List<Map<String, Object>> messages,
            AccionPropuestaTelegram[] accionHolder) throws IOException {
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
        return true;
    }

    String extraerTexto(JsonNode content) {
        StringBuilder textoSb = new StringBuilder();
        for (JsonNode block : content) {
            if ("text".equals(block.path("type").asText())) textoSb.append(block.path("text").asText(""));
        }
        return textoSb.toString();
    }

    int[] leerTokens(JsonNode node) {
        return new int[] {
            node.path("usage").path("input_tokens").asInt(0),
            node.path("usage").path("output_tokens").asInt(0)
        };
    }
}
