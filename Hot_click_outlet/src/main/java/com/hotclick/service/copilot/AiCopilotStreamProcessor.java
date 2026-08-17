package com.hotclick.service.copilot;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.model.Empresa;
import com.hotclick.security.TenantContext;
import com.hotclick.service.AiQuotaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.net.ConnectException;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.util.Map;
import java.util.concurrent.CompletionException;

@Service
public class AiCopilotStreamProcessor {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotStreamProcessor.class);
    private static final int    MAX_RESPONSE_CHARS = 8_000; // hard cap — stops runaway stream output loops

    @Autowired private ObjectMapper  objectMapper;
    @Autowired private AiQuotaService aiQuotaService;

    public static Throwable unwrap(Throwable ex) {
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
    public void reportNvidiaFailure(Throwable cause, Long tenantId, SseEmitter emitter) {
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

    public void chatStreamFallback(Long empresaId, String userMessage, SseEmitter emitter, Throwable t) {
        Long tenantId = TenantContext.get();
        IntegracionExternaException integrationEx = new IntegracionExternaException(
            "nvidia-api", IntegracionExternaException.Tipo.RATE_LIMIT, tenantId,
            "Circuit breaker abierto para NVIDIA API", t);
        log.error("[nvidia-circuit] OPEN tenantId={} msg={}", tenantId, integrationEx.getMessage(), integrationEx);
        sendError(emitter, "El asistente AI no está disponible temporalmente. Intente en unos minutos.");
    }

    public void processStream(HttpResponse<java.util.stream.Stream<String>> response,
                              SseEmitter emitter, Empresa empresa, Long empresaId,
                              MessageSaver messageSaver) {
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
            messageSaver.save(empresa, "assistant", fullText.toString(), tokenCount[1]);
            aiQuotaService.actualizarTokens(empresaId, tokenCount[0], tokenCount[1]);

        } catch (IOException e) {
            log.error("[AI] empresaId={} error de E/S procesando stream de NVIDIA: {}", empresaId, e.getMessage(), e);
            sendError(emitter, "Error procesando respuesta del AI");
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
            // Último intento de avisar al cliente también falló — ya no hay nada más
            // que hacer (cliente desconectado), pero queda visible a nivel debug.
            log.debug("[AI] no se pudo enviar evento de error por SSE: {}", e.getMessage());
        }
    }

    @FunctionalInterface
    public interface MessageSaver {
        void save(Empresa empresa, String rol, String contenido, int tokens);
    }
}
