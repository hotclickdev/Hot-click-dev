package com.hotclick.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.service.publicchat.PublicChatAdvisorHandler;
import com.hotclick.service.publicchat.PublicChatClaudeClient;
import com.hotclick.service.publicchat.PublicChatDiscoveryHandler;
import com.hotclick.service.publicchat.PublicChatIntentHelper;
import com.hotclick.utils.InputSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@Service
public class PublicChatService {

    private static final Logger log = LoggerFactory.getLogger(PublicChatService.class);
    private static final int MAX_MSG_LENGTH = 500;

    private final ObjectMapper objectMapper;
    private final InputSanitizer sanitizer;
    private final PublicChatIntentHelper intentHelper;
    private final PublicChatClaudeClient claudeClient;
    private final PublicChatAdvisorHandler advisorHandler;
    private final PublicChatDiscoveryHandler discoveryHandler;

    public PublicChatService(ObjectMapper objectMapper, InputSanitizer sanitizer,
                             PublicChatIntentHelper intentHelper,
                             PublicChatClaudeClient claudeClient, PublicChatAdvisorHandler advisorHandler,
                             PublicChatDiscoveryHandler discoveryHandler) {
        this.objectMapper = objectMapper;
        this.sanitizer = sanitizer;
        this.intentHelper = intentHelper;
        this.claudeClient = claudeClient;
        this.advisorHandler = advisorHandler;
        this.discoveryHandler = discoveryHandler;
    }

    public void chat(Long empresaId, boolean marketplace, String userMessage, int offset,
                     List<Map<String, Object>> history, String context,
                     List<Long> focusIds, Long productoId, SseEmitter emitter) {
        try {
            String msg = sanitizer.cleanWithLimit(userMessage == null ? "" : userMessage, MAX_MSG_LENGTH);
            if (msg.isBlank()) {
                emitter.send(SseEmitter.event().name("done").data("{}"));
                emitter.complete();
                return;
            }
            userMessage = msg;

            if (productoId == null && intentHelper.isGreeting(userMessage)) {
                boolean en = intentHelper.isEnglish(userMessage);
                String nombre = claudeClient.getEmpresaChatInfo(empresaId).nombre();
                String greeting = en
                    ? "Hello! I'm the " + nombre + " virtual assistant. What product are you looking for today?"
                    : "¡Hola! Soy el asistente de " + nombre + ". ¿Qué producto estás buscando hoy?";
                emitter.send(SseEmitter.event().name("products")
                    .data(objectMapper.writeValueAsString(Map.of("productos", List.of(), "hasMore", false, "query", userMessage))));
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", greeting))));
                List<String> greetingOpts = en
                    ? List.of("What's on sale?", "How does shipping work?")
                    : List.of("¿Qué hay en oferta?", "¿Cómo funciona el envío?");
                emitter.send(SseEmitter.event().name("done")
                    .data(objectMapper.writeValueAsString(Map.of("opts", greetingOpts))));
                emitter.complete();
                return;
            }

            if (intentHelper.isOffTopic(userMessage)) {
                emitter.send(SseEmitter.event().name("products")
                    .data(objectMapper.writeValueAsString(Map.of("productos", List.of(), "hasMore", false, "query", userMessage))));
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text",
                        "Solo puedo ayudarte con los productos de la tienda. ¿Hay algo que estés buscando comprar?"))));
                emitter.send(SseEmitter.event().name("done")
                    .data(objectMapper.writeValueAsString(Map.of("opts",
                        List.of("Ver productos populares", "Contactar por WhatsApp")))));
                emitter.complete();
                return;
            }

            if (intentHelper.isBusinessInfoQuery(userMessage)) {
                boolean en = intentHelper.isEnglish(userMessage);
                emitter.send(SseEmitter.event().name("products")
                    .data(objectMapper.writeValueAsString(Map.of("productos", List.of(), "hasMore", false, "query", userMessage))));
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", claudeClient.businessInfoText(empresaId, marketplace, en)))));
                List<String> infoOpts = en
                    ? List.of("Show me popular products", "What's on sale?")
                    : List.of("Ver productos populares", "¿Qué hay en oferta?");
                emitter.send(SseEmitter.event().name("done")
                    .data(objectMapper.writeValueAsString(Map.of("opts", infoOpts))));
                emitter.complete();
                return;
            }

            if (intentHelper.isWhatsappContactQuery(userMessage)) {
                boolean en = intentHelper.isEnglish(userMessage);
                emitter.send(SseEmitter.event().name("products")
                    .data(objectMapper.writeValueAsString(Map.of("productos", List.of(), "hasMore", false, "query", userMessage))));
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", claudeClient.whatsappContactText(empresaId, en)))));
                List<String> waOpts = en
                    ? List.of("Show me popular products", "What's on sale?")
                    : List.of("Ver productos populares", "¿Qué hay en oferta?");
                emitter.send(SseEmitter.event().name("done")
                    .data(objectMapper.writeValueAsString(Map.of("opts", waOpts))));
                emitter.complete();
                return;
            }

            if (advisorHandler.tryHandle(empresaId, marketplace, userMessage, history, productoId, emitter)) {
                return;
            }

            discoveryHandler.responder(empresaId, marketplace, userMessage, offset, history, context, focusIds, emitter);

        } catch (Exception e) {
            log.error("[Chat] Error empresa={}: {}", empresaId, e.getMessage());
            try {
                emitter.send(SseEmitter.event().name("error")
                    .data("{\"error\":\"Error al buscar productos\"}"));
                emitter.complete();
            } catch (Exception ae) { log.debug("SSE error: {}", ae.getMessage()); }
        }
    }
}
