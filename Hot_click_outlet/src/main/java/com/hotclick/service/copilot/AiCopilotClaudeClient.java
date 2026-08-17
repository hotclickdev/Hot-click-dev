package com.hotclick.service.copilot;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.exception.IntegracionExternaException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiCopilotClaudeClient {

    private static final int    MAX_TOOL_ROUNDS    = 4;
    private static final long   TOOL_LOOP_BUDGET_MS = 40_000;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String claudeModel;

    @Autowired private ObjectMapper objectMapper;
    @Autowired private AiCopilotClaudeLoopHelper loopHelper;

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
        AccionPropuestaTelegram[] accionHolder = new AccionPropuestaTelegram[1];
        long deadline = System.currentTimeMillis() + TOOL_LOOP_BUDGET_MS;

        for (int ronda = 0; ronda < MAX_TOOL_ROUNDS; ronda++) {
            String requestBody = buildRequestBodyClaude(systemPrompt, messages, tools);
            HttpResponse<String> response = loopHelper.enviarRonda(empresaId, ronda, deadline, requestBody);
            if (response == null) return null;

            JsonNode node    = objectMapper.readTree(response.body());
            JsonNode content = node.path("content");
            int[] tokens = loopHelper.leerTokens(node);
            tokensInTotal  += tokens[0];
            tokensOutTotal += tokens[1];

            if ("tool_use".equals(node.path("stop_reason").asText(""))) {
                loopHelper.procesarToolUse(empresaId, content, messages, accionHolder);
                continue;
            }

            texto = loopHelper.extraerTexto(content);
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
