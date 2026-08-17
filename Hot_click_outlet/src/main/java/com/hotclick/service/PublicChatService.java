package com.hotclick.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.service.publicchat.PublicChatClaudeClient;
import com.hotclick.service.publicchat.PublicChatIntentHelper;
import com.hotclick.service.publicchat.PublicChatProductSearch;
import com.hotclick.utils.InputSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class PublicChatService {

    private static final Logger log = LoggerFactory.getLogger(PublicChatService.class);
    private static final int MAX_MSG_LENGTH = 500;

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final InputSanitizer sanitizer;
    private final PublicChatIntentHelper intentHelper;
    private final PublicChatProductSearch productSearch;
    private final PublicChatClaudeClient claudeClient;

    public PublicChatService(JdbcTemplate jdbc, ObjectMapper objectMapper, InputSanitizer sanitizer,
                             PublicChatIntentHelper intentHelper, PublicChatProductSearch productSearch,
                             PublicChatClaudeClient claudeClient) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.sanitizer = sanitizer;
        this.intentHelper = intentHelper;
        this.productSearch = productSearch;
        this.claudeClient = claudeClient;
    }

    public void chat(Long empresaId, String userMessage, int offset,
                     List<Map<String, Object>> history, String context,
                     List<Long> focusIds, SseEmitter emitter) {
        try {
            String msg = sanitizer.cleanWithLimit(userMessage == null ? "" : userMessage, MAX_MSG_LENGTH);
            if (msg.isBlank()) {
                emitter.send(SseEmitter.event().name("done").data("{}"));
                emitter.complete();
                return;
            }
            userMessage = msg;

            if (intentHelper.isGreeting(userMessage)) {
                boolean en = intentHelper.isEnglish(userMessage);
                String greeting = en
                    ? "Hello! I'm the HOTCLICK virtual assistant. What product are you looking for today?"
                    : "¡Hola! Soy el asistente de HOTCLICK. ¿Qué producto estás buscando hoy?";
                emitter.send(SseEmitter.event().name("products")
                    .data(objectMapper.writeValueAsString(Map.of("productos", List.of(), "hasMore", false, "query", userMessage))));
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", greeting))));
                List<String> greetingOpts = en
                    ? List.of("Show me popular products", "What's on sale?", "How does shipping work?")
                    : List.of("Ver productos populares", "¿Qué hay en oferta?", "¿Cómo funciona el envío?");
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
                        List.of("Ver todos los productos", "¿Qué es HOTCLICK?", "Buscar algo específico")))));
                emitter.complete();
                return;
            }

            if (intentHelper.isBusinessInfoQuery(userMessage)) {
                boolean en = intentHelper.isEnglish(userMessage);
                emitter.send(SseEmitter.event().name("products")
                    .data(objectMapper.writeValueAsString(Map.of("productos", List.of(), "hasMore", false, "query", userMessage))));
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", claudeClient.businessInfoText(empresaId, en)))));
                List<String> infoOpts = en
                    ? List.of("Show me popular products", "What's on sale?", "Contact us on WhatsApp")
                    : List.of("Ver productos populares", "¿Qué hay en oferta?", "Contactar por WhatsApp");
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
                    ? List.of("Show me popular products", "What's on sale?", "What is HOTCLICK?")
                    : List.of("Ver productos populares", "¿Qué hay en oferta?", "¿Qué es HOTCLICK?");
                emitter.send(SseEmitter.event().name("done")
                    .data(objectMapper.writeValueAsString(Map.of("opts", waOpts))));
                emitter.complete();
                return;
            }

            boolean isEnglish = intentHelper.isEnglish(userMessage);
            Long maxBudget = intentHelper.extractMaxBudget(userMessage);
            boolean isGift = intentHelper.isGiftIntent(userMessage);
            Set<String> negations = intentHelper.extractNegations(userMessage);
            boolean afterHours = intentHelper.isOutsideBusinessHours();
            String intent = intentHelper.classifyIntent(userMessage, isGift, maxBudget);

            boolean showAll = intentHelper.isShowAllOrPopularQuery(userMessage);
            boolean showOffers = !showAll && intentHelper.isOfferQuery(userMessage);
            boolean isFaqFollowUp = !showAll && !showOffers && !history.isEmpty()
                && focusIds != null && !focusIds.isEmpty() && intentHelper.isProductFaqFollowUp(userMessage);
            String tsQuery = (showAll || showOffers || isFaqFollowUp) ? "" : intentHelper.buildTsQuery(userMessage);
            List<Map<String, Object>> productos = isFaqFollowUp
                ? productSearch.buscarPorIds(empresaId, focusIds)
                : showAll
                ? productSearch.buscarPopulares(empresaId, offset)
                : showOffers
                ? productSearch.buscarEnOferta(empresaId, offset)
                : productSearch.buscarProductos(empresaId, tsQuery, userMessage, offset, maxBudget, negations);
            if (isFaqFollowUp && productos.isEmpty()) {
                productos = productSearch.buscarProductos(
                    empresaId, intentHelper.buildTsQuery(userMessage), userMessage, offset, maxBudget, negations
                );
            }
            boolean hasMore = productos.size() > productSearch.getPageSize();
            List<Map<String, Object>> page = productos.stream().limit(productSearch.getPageSize()).toList();

            Map<String, Object> productEvent = new LinkedHashMap<>();
            productEvent.put("productos", page);
            productEvent.put("hasMore", hasMore);
            productEvent.put("query", userMessage);
            emitter.send(SseEmitter.event().name("products")
                .data(objectMapper.writeValueAsString(productEvent)));

            try {
                jdbc.update(
                    "INSERT INTO hot_click_chat_log_tb (fk_id_empresa, idioma, intencion, mensaje_length, " +
                        "productos_encontrados, budget_detectado, terminos_busqueda, fuera_horario) " +
                        "VALUES (?,?,?,?,?,?,?,?)",
                    empresaId, isEnglish ? "en" : "es", intent, userMessage.length(),
                    page.size(), maxBudget, tsQuery, afterHours
                );
            } catch (Exception e) { log.debug("[Chat] Analytics log failed: {}", e.getMessage()); }

            if (page.isEmpty()) {
                String noResult = isEnglish
                    ? "I didn't find products for that. Could you describe what you're looking for? Example: living room, kitchen, bedroom…"
                    : "No encontré productos para eso. ¿Podés describirlo con otras palabras? Ej: sala, cocina, jardín, dormitorio…";
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", noResult))));
                List<String> noResultOpts = isEnglish
                    ? List.of("Show popular items", "What's on sale?", "Contact us on WhatsApp")
                    : List.of("Ver productos populares", "¿Qué hay en oferta?", "Contactar por WhatsApp");
                emitter.send(SseEmitter.event().name("done")
                    .data(objectMapper.writeValueAsString(Map.of("opts", noResultOpts))));
                emitter.complete();
                return;
            }

            List<String> smartOpts = claudeClient.generateOpts(context, page, userMessage, isEnglish, afterHours);
            if (claudeClient.hasApiKey()) {
                claudeClient.streamClaudeResponse(emitter, userMessage, page, history, empresaId, context,
                    isEnglish, isGift, maxBudget, negations, afterHours, smartOpts);
            } else {
                String texto = claudeClient.generarRespuestaMock(page, history, isEnglish);
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", texto))));
                emitter.send(SseEmitter.event().name("done")
                    .data(objectMapper.writeValueAsString(Map.of("opts", smartOpts))));
                emitter.complete();
            }

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
