package com.hotclick.controller;

import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.PublicChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.Executor;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

/**
 * Public product discovery chat — no JWT required.
 *
 * POST /api/public/chat?slug=mi-tienda
 *   body: { message: "algo para la sala", offset: 0 }
 *
 * Streams SSE:
 *   event: products  — { productos: [...], hasMore: boolean }
 *   event: delta     — { text: "..." }   (Claude response chunks)
 *   event: done      — {}
 */
@RestController
@RequestMapping("/api/public/chat")
public class PublicChatController {

    @Autowired private PublicChatService   chatService;
    @Autowired private EmpresaRepository  empresaRepository;
    @Autowired @Qualifier("sseExecutor") private Executor sseExecutor;

    @PostMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(
            @RequestParam(required = false) String slug,
            @RequestBody Map<String, Object> body) {

        String message = ((String) body.getOrDefault("message", "")).trim();
        int rawOffset  = body.containsKey("offset") ? ((Number) body.get("offset")).intValue() : 0;
        int offset     = Math.max(0, Math.min(rawOffset, 10_000));

        SseEmitter emitter = new SseEmitter(60_000L);

        if (message.isBlank()) {
            try {
                emitter.send(SseEmitter.event().name("done").data("{}"));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }

        // Resolve empresaId from slug or take first active
        Long empresaId = slug != null && !slug.isBlank()
            ? empresaRepository.findBySlug(slug).map(e -> e.getId()).orElse(null)
            : empresaRepository.findFirstByEstadoEmpresaOrderByIdAsc("ACTIVO").map(e -> e.getId()).orElse(null);

        if (empresaId == null) {
            try {
                emitter.send(SseEmitter.event().name("error").data("{\"error\":\"Tienda no encontrada\"}"));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }

        final Long eid = empresaId;
        emitter.onCompletion(() -> emitter.complete());
        emitter.onTimeout(() -> emitter.complete());
        sseExecutor.execute(() -> chatService.chat(eid, message, offset, emitter));
        return emitter;
    }
}
