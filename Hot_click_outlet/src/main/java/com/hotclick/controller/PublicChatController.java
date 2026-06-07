package com.hotclick.controller;

import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.RateLimiter;
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
 * Rate limits:
 *   - IP-level 10/60s → RateLimitingFilter
 *   - Per-empresa 300/day → this controller (protects AI cost per tenant)
 *
 * Streams SSE:
 *   event: products  — { productos: [...], hasMore: boolean }
 *   event: delta     — { text: "..." }   (Claude response chunks)
 *   event: done      — {}
 */
@RestController
@RequestMapping("/api/public/chat")
public class PublicChatController {

    // 300 public chat calls per empresa per day — enough for real traffic,
    // blocks runaway bots that would exhaust AI costs.
    private static final int  DAILY_MAX    = 300;
    private static final int  DAILY_WINDOW = 86_400; // 24h
    private static final int  MAX_MSG_CHARS = 500;

    @Autowired private PublicChatService  chatService;
    @Autowired private EmpresaRepository  empresaRepository;
    @Autowired private RateLimiter        rateLimiter;
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
            return doneEmitter(emitter);
        }

        // Truncate to avoid token bombs
        if (message.length() > MAX_MSG_CHARS) {
            message = message.substring(0, MAX_MSG_CHARS);
        }

        // Resolve empresaId from slug or take first active
        Long empresaId = slug != null && !slug.isBlank()
            ? empresaRepository.findBySlug(slug).map(e -> e.getId()).orElse(null)
            : empresaRepository.findFirstByEstadoEmpresaOrderByIdAsc("ACTIVO").map(e -> e.getId()).orElse(null);

        if (empresaId == null) {
            return errorEmitter(emitter, "Tienda no encontrada");
        }

        // Per-empresa daily limit to protect AI cost
        String dailyKey = "empresa:" + empresaId + ":public_chat:day";
        if (!rateLimiter.tryAcquire(dailyKey, DAILY_MAX, DAILY_WINDOW)) {
            return errorEmitter(emitter, "Límite diario del chat alcanzado. Volvé mañana.");
        }

        final Long eid = empresaId;
        final String finalMessage = message;
        emitter.onCompletion(emitter::complete);
        emitter.onTimeout(emitter::complete);
        sseExecutor.execute(() -> chatService.chat(eid, finalMessage, offset, emitter));
        return emitter;
    }

    private SseEmitter doneEmitter(SseEmitter emitter) {
        try {
            emitter.send(SseEmitter.event().name("done").data("{}"));
            emitter.complete();
        } catch (Exception ignored) {}
        return emitter;
    }

    private SseEmitter errorEmitter(SseEmitter emitter, String msg) {
        try {
            emitter.send(SseEmitter.event().name("error")
                .data("{\"error\":\"" + msg + "\"}"));
            emitter.complete();
        } catch (Exception ignored) {}
        return emitter;
    }
}
