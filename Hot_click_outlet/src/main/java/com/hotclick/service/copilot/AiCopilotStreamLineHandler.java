package com.hotclick.service.copilot;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;

/**
 * Procesamiento de líneas SSE del stream NVIDIA — extraído bit-idéntico de {@link AiCopilotStreamProcessor}.
 */
@Component
class AiCopilotStreamLineHandler {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotStreamLineHandler.class);

    @Autowired private ObjectMapper objectMapper;

    /** @return texto delta emitido, o null si no hubo texto. */
    String procesarLinea(String line, SseEmitter emitter, Long empresaId,
            StringBuilder fullText, int[] tokenCount, int maxResponseChars) {
        if (!line.startsWith("data: ")) return null;
        String json = line.substring(6).trim();
        if ("[DONE]".equals(json)) return null;
        try {
            JsonNode node = objectMapper.readTree(json);

            JsonNode usage = node.path("usage");
            if (usage.isObject()) {
                tokenCount[0] = usage.path("prompt_tokens").asInt(tokenCount[0]);
                tokenCount[1] = usage.path("completion_tokens").asInt(tokenCount[1]);
            }

            String text = node.path("choices").path(0).path("delta").path("content").asText("");
            if (text.isEmpty()) return null;
            if (fullText.length() >= maxResponseChars) return null;
            fullText.append(text);
            try {
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", text))));
            } catch (IOException e) {
                log.debug("[AI] empresaId={} cliente desconectado durante stream: {}", empresaId, e.getMessage());
            }
            return text;
        } catch (JsonProcessingException e) {
            log.warn("[AI] empresaId={} chunk SSE de NVIDIA no se pudo parsear: {}", empresaId, e.getMessage());
            return null;
        }
    }
}
