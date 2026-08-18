package com.hotclick.service.copilot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.security.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;

@Service
public class AiCopilotStreamProcessor {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotStreamProcessor.class);

    @Autowired private ObjectMapper objectMapper;

    @SuppressWarnings("unused") // userMessage forma parte de la firma del fallback de Resilience4j
    public void chatStreamFallback(Long empresaId, String userMessage, SseEmitter emitter, Throwable t) {
        Long tenantId = TenantContext.get();
        IntegracionExternaException integrationEx = new IntegracionExternaException(
            "claude-api", IntegracionExternaException.Tipo.RATE_LIMIT, tenantId,
            "Circuit breaker abierto para Claude API", t);
        log.error("[claude-circuit] OPEN empresaId={} tenantId={} msg={}",
            empresaId, tenantId, integrationEx.getMessage(), integrationEx);
        sendError(emitter, "El asistente AI no está disponible temporalmente. Intente en unos minutos.");
    }

    public void streamText(SseEmitter emitter, String text) {
        try {
            if (text != null && !text.isBlank()) {
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", text))));
            }
            emitter.send(SseEmitter.event().name("done").data("{}"));
            emitter.complete();
        } catch (IOException e) {
            log.debug("[AI] cliente desconectado durante stream: {}", e.getMessage());
        }
    }

    public void streamMock(SseEmitter emitter, String text) {
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

    public void sendError(SseEmitter emitter, String msg) {
        try {
            emitter.send(SseEmitter.event().name("error")
                .data(objectMapper.writeValueAsString(Map.of("error", msg))));
            emitter.complete();
        } catch (IOException e) {
            log.debug("[AI] no se pudo enviar evento de error por SSE: {}", e.getMessage());
        }
    }
}
