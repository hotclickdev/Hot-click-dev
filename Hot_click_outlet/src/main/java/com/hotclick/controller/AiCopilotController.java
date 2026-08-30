package com.hotclick.controller;

import com.hotclick.dto.AiChatRequest;
import com.hotclick.security.RateLimiter;
import com.hotclick.security.TenantContext;
import com.hotclick.service.AiCopilotService;
import com.hotclick.service.AiQuotaService;
import com.hotclick.service.copilot.AiCopilotStreamProcessor;
import com.hotclick.sse.SseStreamHeaders;
import io.sentry.Sentry;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.concurrent.Executor;

@RestController
@RequestMapping("/api/admin/ai")
@PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
public class AiCopilotController {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotController.class);

    // Per-empresa burst limit: 10 calls per 5 minutes.
    // Prevents a single tenant from flooding the AI even within monthly quota.
    private static final int  BURST_MAX     = 10;
    private static final int  BURST_WINDOW  = 300; // 5 min
    private static final int  MAX_MSG_CHARS = 2_000;

    @Autowired private AiCopilotService aiCopilotService;
    @Autowired private AiQuotaService   aiQuotaService;
    @Autowired private RateLimiter      rateLimiter;
    @Autowired @Qualifier("sseExecutor") private Executor sseExecutor;
    @Autowired private com.hotclick.service.TextModerationService textModerationService;
    @Autowired private AiCopilotStreamProcessor streamProcessor;

    /** SSE streaming chat endpoint. */
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@Valid @RequestBody AiChatRequest body, HttpServletResponse response) {
        SseStreamHeaders.aplicar(response);
        String message = body.getMessage() == null ? "" : body.getMessage().trim();
        SseEmitter emitter = new SseEmitter(120_000L);

        if (message.isBlank()) {
            return errorEmitter(emitter, "Mensaje vacío");
        }

        var textMod = textModerationService.moderar(message);
        if (!textMod.safe()) {
            return errorEmitter(emitter, "Mensaje rechazado: contenido no permitido en la plataforma");
        }

        if (message.length() > MAX_MSG_CHARS) {
            message = message.substring(0, MAX_MSG_CHARS);
        }

        Long empresaId = TenantContext.get();
        if (empresaId == null) {
            return errorEmitter(emitter, "Seleccioná un negocio para usar el copilot.");
        }

        String burstKey = "empresa:" + empresaId + ":ai:burst";
        if (!rateLimiter.tryAcquire(burstKey, BURST_MAX, BURST_WINDOW)) {
            return errorEmitter(emitter, "Demasiadas consultas al AI en poco tiempo. Esperá un momento.");
        }

        final String finalMessage = message;
        emitter.onTimeout(emitter::complete);
        lanzarChat(emitter, empresaId, finalMessage);
        return emitter;
    }

    /** Current month usage + quota for the empresa. */
    @GetMapping("/uso")
    public ResponseEntity<?> uso() {
        return ResponseEntity.ok(aiQuotaService.getUsoMes(TenantContext.get()));
    }

    /** Conversation history. */
    @GetMapping("/historial")
    public ResponseEntity<?> historial() {
        return ResponseEntity.ok(aiCopilotService.getHistorial(TenantContext.get()));
    }

    /** Preguntas sugeridas dinámicas — priorizan hallazgos reales del negocio del tenant. */
    @GetMapping("/sugerencias")
    public ResponseEntity<?> sugerencias() {
        return ResponseEntity.ok(aiCopilotService.getSugerencias(TenantContext.get()));
    }

    /**
     * Productos sin ventas recientes con la acción sugerida (solo lectura).
     * La aplicación real del descuento pasa por PATCH /api/productos/{id}/oferta,
     * que el dueño de la empresa o ADMIN debe confirmar explícitamente desde la UI.
     */
    @GetMapping("/productos-sin-venta")
    public ResponseEntity<?> productosSinVenta() {
        return ResponseEntity.ok(aiCopilotService.getProductosSinVentaAccionables(TenantContext.get()));
    }

    @GetMapping("/insights")
    public ResponseEntity<?> insights() {
        return ResponseEntity.ok(aiCopilotService.getInsights(TenantContext.get()));
    }

    /** Clear conversation history. */
    @DeleteMapping("/historial")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
    public ResponseEntity<?> limpiar() {
        aiCopilotService.limpiarHistorial(TenantContext.get());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    /**
     * El emitter se devuelve vacío: Spring tiene que commitear las cabeceras SSE
     * antes de escribir. Completarlo en este hilo provoca
     * {@code ERR_INCOMPLETE_CHUNKED_ENCODING} en Chrome.
     */
    private SseEmitter errorEmitter(SseEmitter emitter, String msg) {
        sseExecutor.execute(() -> streamProcessor.sendError(emitter, msg));
        return emitter;
    }

    private void lanzarChat(SseEmitter emitter, Long empresaId, String message) {
        sseExecutor.execute(() -> {
            try {
                aiCopilotService.chatStream(empresaId, message, emitter);
            } catch (Exception e) {
                log.error("[AI] stream copilot falló empresaId={}", empresaId, e);
                Sentry.captureException(e);
                streamProcessor.sendError(emitter, "Hot no pudo responder. Reintentá en un momento.");
            }
        });
    }
}
