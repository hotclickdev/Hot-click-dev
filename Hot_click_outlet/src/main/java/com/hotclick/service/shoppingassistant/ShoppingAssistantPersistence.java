package com.hotclick.service.shoppingassistant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.pipeline.RagResult;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Component
class ShoppingAssistantPersistence {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    ShoppingAssistantPersistence(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    /**
     * Guarda de forma atómica el mensaje del usuario, la respuesta del asistente
     * (con los productos referenciados en JSONB) y actualiza el timestamp de la sesión.
     */
    @Transactional
    void persistirMensajes(UUID sesionId, Long empresaId,
                           String userMessage, RagResult resultado) {
        String productosJson = toJson(resultado.productosReferenciados());

        // Mensaje del usuario (sin referencias de productos)
        jdbc.update("""
            INSERT INTO hot_click_chat_mensaje_shopping_tb
              (fk_id_sesion, fk_id_empresa, rol, contenido,
               tokens_entrada, tokens_salida, productos_refs, fecha_creacion)
            VALUES (?::uuid, ?, 'user', ?, 0, 0, '[]'::jsonb, NOW())
            """,
            sesionId.toString(), empresaId, userMessage);

        // Respuesta del asistente (con los productos que el RAG recuperó como contexto)
        jdbc.update("""
            INSERT INTO hot_click_chat_mensaje_shopping_tb
              (fk_id_sesion, fk_id_empresa, rol, contenido,
               tokens_entrada, tokens_salida, productos_refs, fecha_creacion)
            VALUES (?::uuid, ?, 'assistant', ?, ?, ?, ?::jsonb, NOW())
            """,
            sesionId.toString(), empresaId, resultado.respuesta(),
            resultado.tokensEntrada(), resultado.tokensSalida(), productosJson);

        // Mantener ultimo_mensaje_en actualizado para retención de datos
        jdbc.update(
            "UPDATE hot_click_chat_sesion_tb SET ultimo_mensaje_en = NOW() WHERE id_sesion = ?::uuid",
            sesionId.toString());
    }

    private String toJson(List<ProductoContexto> productos) {
        try {
            return objectMapper.writeValueAsString(productos);
        } catch (Exception e) {
            return "[]";
        }
    }
}
