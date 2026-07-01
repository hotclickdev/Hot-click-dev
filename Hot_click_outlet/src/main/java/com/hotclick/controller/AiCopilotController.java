package com.hotclick.controller;

import com.hotclick.security.RateLimiter;
import com.hotclick.security.TenantContext;
import com.hotclick.service.AiCopilotService;
import com.hotclick.service.AiQuotaService;
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

    /** SSE streaming chat endpoint. */
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@RequestBody Map<String, String> body) {
        String message = body.getOrDefault("message", "").trim();
        SseEmitter emitter = new SseEmitter(120_000L);

        if (message.isBlank()) {
            return errorEmitter(emitter, "Mensaje vacío");
        }

        var textMod = textModerationService.moderar(message);
        if (!textMod.safe()) {
            return errorEmitter(emitter, "Mensaje rechazado: contenido no permitido en la plataforma");
        }

        // Truncate oversized messages rather than reject — preserves UX,
        // prevents token bombs from malformed or automated clients.
        if (message.length() > MAX_MSG_CHARS) {
            message = message.substring(0, MAX_MSG_CHARS);
        }

        Long empresaId = TenantContext.get();

        // Per-empresa burst guard (independent of monthly quota)
        String burstKey = "empresa:" + empresaId + ":ai:burst";
        if (!rateLimiter.tryAcquire(burstKey, BURST_MAX, BURST_WINDOW)) {
            return errorEmitter(emitter, "Demasiadas consultas al AI en poco tiempo. Esperá un momento.");
        }

        final String finalMessage = message;
        emitter.onCompletion(emitter::complete);
        emitter.onTimeout(emitter::complete);
        sseExecutor.execute(() -> aiCopilotService.chatStream(empresaId, finalMessage, emitter));
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

    /** Clear conversation history. */
    @DeleteMapping("/historial")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN')")
    public ResponseEntity<?> limpiar() {
        aiCopilotService.limpiarHistorial(TenantContext.get());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private SseEmitter errorEmitter(SseEmitter emitter, String msg) {
        try {
            emitter.send(SseEmitter.event().name("error")
                .data("{\"error\":\"" + msg + "\"}"));
            emitter.complete();
        } catch (Exception e) { log.warn("SSE error: {}", e.getMessage()); }
        return emitter;
    }
}
