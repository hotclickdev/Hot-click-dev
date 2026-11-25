package com.hotclick.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.asesor.AsesorWebService;
import com.hotclick.agente.asesor.ChatTiendaService;
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
    private final AsesorWebService asesorWeb;
    private final ChatTiendaService chatTienda;

    public PublicChatService(ObjectMapper objectMapper, InputSanitizer sanitizer,
                             PublicChatIntentHelper intentHelper,
                             PublicChatClaudeClient claudeClient, PublicChatAdvisorHandler advisorHandler,
                             PublicChatDiscoveryHandler discoveryHandler,
                             AsesorWebService asesorWeb, ChatTiendaService chatTienda) {
        this.objectMapper = objectMapper;
        this.sanitizer = sanitizer;
        this.intentHelper = intentHelper;
        this.claudeClient = claudeClient;
        this.advisorHandler = advisorHandler;
        this.discoveryHandler = discoveryHandler;
        this.asesorWeb = asesorWeb;
        this.chatTienda = chatTienda;
    }

    public void chat(Long empresaId, boolean marketplace, String userMessage, int offset,
                     List<Map<String, Object>> history, String context,
                     List<Long> focusIds, Long productoId, boolean conModelo, SseEmitter emitter) {
        chat(empresaId, marketplace, userMessage, offset, history, context, focusIds, productoId, conModelo,
            null, emitter);
    }

    /** @param usuarioId usuario autenticado (resuelto en el hilo de la petición) o null si es anónimo. */
    public void chat(Long empresaId, boolean marketplace, String userMessage, int offset,
                     List<Map<String, Object>> history, String context,
                     List<Long> focusIds, Long productoId, boolean conModelo, Long usuarioId, SseEmitter emitter) {
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

            // AG-28: acciones del asesor (carrito, estado de pedido) por el motor con tools; solo con modelo disponible.
            if (conModelo
                    && asesorWeb.tryHandle(empresaId, marketplace, claudeClient.getEmpresaChatInfo(empresaId).nombre(),
                        userMessage, history, productoId, usuarioId, emitter)) {
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
                // AG-28: botón al chat de la tienda, solo si su plan lo permite (misma regla que /api/public/branding).
                List<Map<String, String>> botones = chatTienda.urlWhatsapp(empresaId, marketplace)
                    .map(u -> List.of(Map.of("tipo", "whatsapp", "label", en ? "Store chat" : "Chat de la tienda", "url", u)))
                    .orElse(List.of());
                emitter.send(SseEmitter.event().name("done")
                    .data(objectMapper.writeValueAsString(Map.of("opts", waOpts, "acciones", botones))));
                emitter.complete();
                return;
            }

            if (intentHelper.isShippingQuery(userMessage)) {
                boolean en = intentHelper.isEnglish(userMessage);
                emitter.send(SseEmitter.event().name("products")
                    .data(objectMapper.writeValueAsString(Map.of("productos", List.of(), "hasMore", false, "query", userMessage))));
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", shippingText(en)))));
                List<String> shipOpts = en
                    ? List.of("Show me popular products", "How do I pay?")
                    : List.of("Ver productos populares", "¿Cómo pago?");
                emitter.send(SseEmitter.event().name("done")
                    .data(objectMapper.writeValueAsString(Map.of("opts", shipOpts))));
                emitter.complete();
                return;
            }

            if (advisorHandler.tryHandle(empresaId, marketplace, userMessage, history, productoId, emitter)) {
                return;
            }

            discoveryHandler.responder(empresaId, marketplace, userMessage, offset, history, context, focusIds,
                conModelo, emitter);

        } catch (Exception e) {
            log.error("[Chat] Error empresa={}: {}", empresaId, e.getMessage());
            try {
                emitter.send(SseEmitter.event().name("error")
                    .data("{\"error\":\"Error al buscar productos\"}"));
                emitter.complete();
            } catch (Exception ae) { log.debug("SSE error: {}", ae.getMessage()); }
        }
    }

    /** Sin montos fijos: el costo real depende del destino y se muestra en el checkout. */
    static String shippingText(boolean en) {
        return en
            ? "We ship to all of Costa Rica with Correos de Costa Rica or by courier. "
                + "Cost and delivery time depend on the destination and are shown at checkout before you pay."
            : "Enviamos a todo Costa Rica con Correos de Costa Rica o por encomienda. "
                + "El costo y el plazo dependen del destino y te los mostramos en el checkout antes de pagar.";
    }
}
