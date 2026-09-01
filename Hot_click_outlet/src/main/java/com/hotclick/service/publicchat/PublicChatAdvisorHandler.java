package com.hotclick.service.publicchat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Chat de ficha: responde solo con el producto pedido, sin buscar el catálogo.
 */
@Service
public class PublicChatAdvisorHandler {

    private static final Logger log = LoggerFactory.getLogger(PublicChatAdvisorHandler.class);

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final PublicChatProductSearch productSearch;
    private final PublicChatClaudeClient claudeClient;
    private final PublicChatIntentHelper intentHelper;

    public PublicChatAdvisorHandler(JdbcTemplate jdbc, ObjectMapper objectMapper,
                                    PublicChatProductSearch productSearch,
                                    PublicChatClaudeClient claudeClient,
                                    PublicChatIntentHelper intentHelper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.productSearch = productSearch;
        this.claudeClient = claudeClient;
        this.intentHelper = intentHelper;
    }

    public boolean tryHandle(Long empresaId, boolean marketplace, String userMessage,
                             List<Map<String, Object>> history, Long productoId,
                             SseEmitter emitter) {
        if (productoId == null || productoId <= 0) return false;
        try {
            asesorar(empresaId, marketplace, userMessage, history, productoId, emitter);
        } catch (Exception e) {
            log.error("[Chat] Asesor ficha empresa={} producto={}: {}", empresaId, productoId, e.getMessage());
            enviarError(emitter);
        }
        return true;
    }

    private void asesorar(Long empresaId, boolean marketplace, String userMessage,
                          List<Map<String, Object>> history, Long productoId,
                          SseEmitter emitter) throws Exception {
        Map<String, Object> ficha = productSearch.buscarFichaAsesor(empresaId, marketplace, productoId);
        if (ficha == null) {
            enviarProductosVacios(emitter, userMessage);
            enviarTextoYCerrar(emitter, "Este producto no está disponible. ¿Querés ver el catálogo?",
                List.of("Ver productos populares", "Contactar por WhatsApp"));
            return;
        }
        enviarProductoFicha(emitter, ficha, userMessage);
        registrarAnalitica(empresaId, userMessage);
        boolean isEnglish = intentHelper.isEnglish(userMessage);
        boolean afterHours = intentHelper.isOutsideBusinessHours();
        List<String> opts = claudeClient.generateAdvisorOpts(isEnglish);
        if (claudeClient.hasApiKey()) {
            claudeClient.streamAdvisorResponse(emitter, userMessage, ficha, history, empresaId,
                isEnglish, afterHours, opts);
            return;
        }
        enviarTextoYCerrar(emitter, claudeClient.generarRespuestaAsesor(ficha, isEnglish), opts);
    }

    private void enviarProductosVacios(SseEmitter emitter, String query) throws Exception {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("productos", List.of());
        event.put("hasMore", false);
        event.put("query", query);
        emitter.send(SseEmitter.event().name("products")
            .data(objectMapper.writeValueAsString(event)));
    }

    private void enviarProductoFicha(SseEmitter emitter, Map<String, Object> ficha, String query) throws Exception {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("productos", List.of(ficha));
        event.put("hasMore", false);
        event.put("query", query);
        emitter.send(SseEmitter.event().name("products")
            .data(objectMapper.writeValueAsString(event)));
    }

    private void enviarTextoYCerrar(SseEmitter emitter, String texto, List<String> opts) throws Exception {
        emitter.send(SseEmitter.event().name("delta")
            .data(objectMapper.writeValueAsString(Map.of("text", texto))));
        emitter.send(SseEmitter.event().name("done")
            .data(objectMapper.writeValueAsString(Map.of("opts", opts))));
        emitter.complete();
    }

    private void registrarAnalitica(Long empresaId, String userMessage) {
        try {
            jdbc.update(
                "INSERT INTO hot_click_chat_log_tb (fk_id_empresa, idioma, intencion, mensaje_length, "
                    + "productos_encontrados, budget_detectado, terminos_busqueda, fuera_horario) "
                    + "VALUES (?,?,?,?,?,?,?,?)",
                empresaId, "es", "ASESOR_FICHA", userMessage.length(),
                1, null, "", false
            );
        } catch (Exception e) {
            log.debug("[Chat] Analytics log failed: {}", e.getMessage());
        }
    }

    private void enviarError(SseEmitter emitter) {
        try {
            emitter.send(SseEmitter.event().name("error")
                .data("{\"error\":\"Error al consultar el producto\"}"));
            emitter.complete();
        } catch (Exception e) {
            log.debug("SSE error: {}", e.getMessage());
        }
    }
}
