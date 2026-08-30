package com.hotclick.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.PublicChatRequest;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.PublicChatService;
import com.hotclick.service.TextModerationService;
import com.hotclick.service.catalogo.MarketplaceCatalogo;
import com.hotclick.service.publicchat.PublicChatRequestParser;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;

/**
 * Chat público de descubrimiento — sin JWT.
 *
 * POST /api/public/chat?slug=mi-tienda
 *   body: { message, offset, history, context, focusIds, productoId }
 */
@RestController
@RequestMapping("/api/public/chat")
public class PublicChatController {

    private static final Logger log = LoggerFactory.getLogger(PublicChatController.class);
    private static final int DAILY_MAX = 300;
    private static final int DAILY_WINDOW = 86_400;

    @Autowired private PublicChatService chatService;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private RateLimiter rateLimiter;
    @Autowired @Qualifier("sseExecutor") private Executor sseExecutor;
    @Autowired private TextModerationService textModerationService;
    @Autowired private ObjectMapper objectMapper;

    @PostMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(
            @RequestParam(required = false) String slug,
            @Valid @RequestBody PublicChatRequest body) {

        SseEmitter emitter = new SseEmitter(60_000L);
        String message = PublicChatRequestParser.mensaje(body);
        if (message.isBlank()) {
            return doneEmitter(emitter);
        }

        var textMod = textModerationService.moderar(message);
        if (!textMod.safe()) {
            return errorEmitter(emitter, "Mensaje rechazado: contenido no permitido en la plataforma");
        }

        Long empresaId = resolverEmpresa(slug);
        if (empresaId == null) {
            return errorEmitter(emitter, "Tienda no encontrada");
        }

        String dailyKey = "empresa:" + empresaId + ":public_chat:day";
        if (!rateLimiter.tryAcquire(dailyKey, DAILY_MAX, DAILY_WINDOW)) {
            return errorEmitter(emitter, "Límite diario del chat alcanzado. Volvé mañana.");
        }

        lanzarChat(emitter, empresaId, slug, message, body);
        return emitter;
    }

    private Long resolverEmpresa(String slug) {
        if (slug != null && !slug.isBlank()) {
            return empresaRepository.findBySlug(slug).map(e -> e.getId()).orElse(null);
        }
        return empresaRepository.findFirstByEstadoEmpresaOrderByIdAsc("ACTIVO")
            .map(e -> e.getId()).orElse(null);
    }

    private void lanzarChat(SseEmitter emitter, Long empresaId, String slug,
                            String message, PublicChatRequest body) {
        int offset = PublicChatRequestParser.offset(body);
        List<Map<String, Object>> history = PublicChatRequestParser.history(body);
        String context = PublicChatRequestParser.contexto(body);
        List<Long> focusIds = PublicChatRequestParser.focusIds(body);
        Long productoId = PublicChatRequestParser.productoId(body);
        boolean marketplace = MarketplaceCatalogo.esMarketplace(slug);
        emitter.onCompletion(emitter::complete);
        emitter.onTimeout(emitter::complete);
        sseExecutor.execute(() -> chatService.chat(
            empresaId, marketplace, message, offset, history, context, focusIds, productoId, emitter));
    }

    private SseEmitter doneEmitter(SseEmitter emitter) {
        try {
            emitter.send(SseEmitter.event().name("done").data("{}"));
            emitter.complete();
        } catch (Exception e) {
            log.debug("SSE error: {}", e.getMessage());
        }
        return emitter;
    }

    private SseEmitter errorEmitter(SseEmitter emitter, String msg) {
        try {
            emitter.send(SseEmitter.event().name("error")
                .data(objectMapper.writeValueAsString(Map.of("error", msg))));
            emitter.complete();
        } catch (Exception e) {
            log.debug("SSE error: {}", e.getMessage());
        }
        return emitter;
    }
}
