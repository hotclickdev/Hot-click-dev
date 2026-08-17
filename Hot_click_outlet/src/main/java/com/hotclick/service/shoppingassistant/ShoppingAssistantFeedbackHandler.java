package com.hotclick.service.shoppingassistant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
class ShoppingAssistantFeedbackHandler {

    private static final Logger log = LoggerFactory.getLogger(ShoppingAssistantFeedbackHandler.class);

    private final JdbcTemplate jdbc;

    ShoppingAssistantFeedbackHandler(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Guarda el feedback (👍/👎) del usuario sobre un mensaje del asistente.
     * Identifica el mensaje por posición ordinal (0-based) dentro de la sesión.
     * Operación best-effort: los errores se loguean pero nunca se propagan.
     */
    void submitFeedback(String sesionIdStr, int msgIndex, int rating) {
        if (sesionIdStr == null || sesionIdStr.isBlank()) return;
        if (rating != 1 && rating != -1) return;
        try {
            UUID sesionId = UUID.fromString(sesionIdStr.trim());
            jdbc.update("""
                UPDATE hot_click_chat_mensaje_shopping_tb
                SET    feedback = ?
                WHERE  id_mensaje = (
                    SELECT id_mensaje
                    FROM   hot_click_chat_mensaje_shopping_tb
                    WHERE  fk_id_sesion = ?::uuid AND rol = 'assistant'
                    ORDER  BY fecha_creacion ASC
                    LIMIT  1 OFFSET ?
                )
                """, rating, sesionId.toString(), msgIndex);
        } catch (IllegalArgumentException ignored) {
            // UUID mal formado — ignorar silenciosamente
        } catch (Exception e) {
            log.warn("[feedback] Error guardando feedback sesion={}: {}", sesionIdStr, e.getMessage());
        }
    }
}
