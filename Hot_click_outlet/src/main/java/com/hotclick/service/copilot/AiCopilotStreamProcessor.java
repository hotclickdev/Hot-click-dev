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
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class AiCopilotStreamProcessor {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotStreamProcessor.class);
    private static final long PING_MS = 10_000;
    /** Candados por identidad de emitter: SseEmitter no es thread-safe entre heartbeat y respuesta. */
    private static final ConcurrentHashMap<SseEmitter, Object> CANDADOS = new ConcurrentHashMap<>();

    @Autowired private ObjectMapper objectMapper;

    /**
     * Comentarios SSE periódicos para que Nginx no cierre el POST mientras Claude corre.
     */
    public AutoCloseable startHeartbeat(SseEmitter emitter) {
        AtomicBoolean vivo = new AtomicBoolean(true);
        Thread hilo = new Thread(() -> latir(emitter, vivo), "copilot-sse-ping");
        hilo.setDaemon(true);
        hilo.start();
        return () -> {
            vivo.set(false);
            hilo.interrupt();
        };
    }

    private void latir(SseEmitter emitter, AtomicBoolean vivo) {
        while (vivo.get()) {
            try {
                Thread.sleep(PING_MS);
                if (!vivo.get()) return;
                enviar(emitter, SseEmitter.event().name("ping").comment("ping").data("{}"));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (IOException e) {
                log.debug("[AI] heartbeat SSE cortado: {}", e.getMessage());
                return;
            }
        }
    }

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
                enviar(emitter, SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", text))));
            }
            enviar(emitter, SseEmitter.event().name("done").data("{}"));
            cerrar(emitter);
        } catch (IOException e) {
            log.debug("[AI] cliente desconectado durante stream: {}", e.getMessage());
        }
    }

    public void streamMock(SseEmitter emitter, String text) {
        try {
            String[] words = text.split(" ");
            for (String w : words) {
                enviar(emitter, SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", w + " "))));
                Thread.sleep(20);
            }
            enviar(emitter, SseEmitter.event().name("done").data("{}"));
            cerrar(emitter);
        } catch (IOException e) {
            log.debug("[AI] cliente desconectado durante mock stream: {}", e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public void sendError(SseEmitter emitter, String msg) {
        try {
            enviar(emitter, SseEmitter.event().name("error")
                .data(objectMapper.writeValueAsString(Map.of("error", msg))));
            cerrar(emitter);
        } catch (IOException e) {
            log.debug("[AI] no se pudo enviar evento de error por SSE: {}", e.getMessage());
        }
    }

    /** SseEmitter no es thread-safe: heartbeat y respuesta no pueden intercalarse. */
    private static void enviar(SseEmitter emitter, SseEmitter.SseEventBuilder event) throws IOException {
        synchronized (candadoDe(emitter)) {
            emitter.send(event);
        }
    }

    private static void cerrar(SseEmitter emitter) {
        Object candado = candadoDe(emitter);
        synchronized (candado) {
            emitter.complete();
        }
        CANDADOS.remove(emitter, candado);
    }

    private static Object candadoDe(SseEmitter emitter) {
        return CANDADOS.computeIfAbsent(emitter, ignored -> new Object());
    }
}
