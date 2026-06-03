package com.hotclick.controller;

import com.hotclick.security.TenantContext;
import com.hotclick.service.AiCopilotService;
import com.hotclick.service.AiQuotaService;
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
@PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT','ADMIN_CLIENTE')")
public class AiCopilotController {

    @Autowired private AiCopilotService aiCopilotService;
    @Autowired private AiQuotaService   aiQuotaService;
    @Autowired @Qualifier("sseExecutor") private Executor sseExecutor;

    /** SSE streaming chat endpoint. */
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@RequestBody Map<String, String> body) {
        String message = body.getOrDefault("message", "").trim();
        if (message.isBlank()) {
            SseEmitter emitter = new SseEmitter(0L);
            try {
                emitter.send(SseEmitter.event().name("error").data("{\"error\":\"Mensaje vacío\"}"));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }

        SseEmitter emitter = new SseEmitter(120_000L); // 2 min timeout
        Long empresaId = TenantContext.get();
        emitter.onCompletion(() -> emitter.complete());
        emitter.onTimeout(() -> emitter.complete());
        sseExecutor.execute(() -> aiCopilotService.chatStream(empresaId, message, emitter));
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
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT')")
    public ResponseEntity<?> limpiar() {
        aiCopilotService.limpiarHistorial(TenantContext.get());
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
