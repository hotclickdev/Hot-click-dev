package com.hotclick.service.shoppingassistant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
class ShoppingAssistantSessionHelper {

    private static final Logger log = LoggerFactory.getLogger(ShoppingAssistantSessionHelper.class);

    /** Número de mensajes históricos (user + assistant) que se envían a Claude como contexto. */
    static final int HISTORY_MESSAGES = 6;   // 3 turnos = 6 mensajes

    private final JdbcTemplate jdbc;

    ShoppingAssistantSessionHelper(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Valida la sesión proporcionada por el cliente o crea una nueva.
     * Si el sesionIdStr es un UUID válido que pertenece a la empresa correcta, se reutiliza.
     * En cualquier otro caso (UUID inválido, sesión expirada, empresa distinta)
     * se crea una sesión nueva para prevenir session fixation.
     */
    UUID resolveSession(String sesionIdStr, Long empresaId) {
        if (sesionIdStr != null && !sesionIdStr.isBlank()) {
            try {
                UUID candidato = UUID.fromString(sesionIdStr.trim());
                Integer count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM hot_click_chat_sesion_tb " +
                    "WHERE id_sesion = ?::uuid AND fk_id_empresa = ?",
                    Integer.class, candidato.toString(), empresaId);
                if (count != null && count > 0) {
                    return candidato; // sesión válida y pertenece a esta empresa
                }
            } catch (IllegalArgumentException ignored) {
                // UUID mal formado — crear nueva sesión
            }
        }

        UUID nuevo = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO hot_click_chat_sesion_tb
              (id_sesion, fk_id_empresa, canal, iniciada_en, ultimo_mensaje_en, metadatos)
            VALUES (?::uuid, ?, 'WEB', NOW(), NOW(), '{}')
            """, nuevo.toString(), empresaId);
        log.debug("[rag] Sesión creada id={} empresa={}", nuevo, empresaId);
        return nuevo;
    }

    /**
     * Carga los últimos {@value #HISTORY_MESSAGES} mensajes de la sesión en orden
     * cronológico ascendente, en el formato que espera la API de Anthropic Claude
     * ({@code role}/{@code content}).
     */
    List<Map<String, Object>> loadHistory(UUID sesionId) {
        // ORDER BY DESC + reversa en Java: trae los N más recientes en orden cronológico.
        List<Map<String, Object>> rows = jdbc.queryForList(
            """
            SELECT rol, contenido
            FROM   hot_click_chat_mensaje_shopping_tb
            WHERE  fk_id_sesion = ?::uuid
              AND  rol IN ('user', 'assistant')
            ORDER  BY fecha_creacion DESC
            LIMIT  ?
            """,
            sesionId.toString(), HISTORY_MESSAGES
        );

        Collections.reverse(rows); // cronológico: más antiguo primero

        return rows.stream()
            .filter(r -> r.get("contenido") != null)
            .map(r -> Map.<String, Object>of(
                "role",    r.get("rol").toString(),
                "content", r.get("contenido").toString()
            ))
            .toList();
    }

    /**
     * Retorna los últimos 30 mensajes de una sesión en formato frontend
     * ({@code rol}/{@code texto}), para re-sincronizar el historial en page reload
     * y permitir que CartAssistant lea el contexto de la sesión GENERAL.
     */
    Map<String, Object> getSessionHistory(String sesionIdStr) {
        if (sesionIdStr == null || sesionIdStr.isBlank()) {
            return Map.of("sesionId", "", "mensajes", List.of());
        }
        try {
            UUID sesionId = UUID.fromString(sesionIdStr.trim());

            Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM hot_click_chat_sesion_tb WHERE id_sesion = ?::uuid",
                Integer.class, sesionId.toString());
            if (count == null || count == 0) {
                return Map.of("sesionId", sesionIdStr, "mensajes", List.of());
            }

            List<Map<String, Object>> rows = jdbc.queryForList(
                """
                SELECT rol, contenido
                FROM   hot_click_chat_mensaje_shopping_tb
                WHERE  fk_id_sesion = ?::uuid
                  AND  rol IN ('user', 'assistant')
                ORDER  BY fecha_creacion DESC
                LIMIT  30
                """,
                sesionId.toString());

            Collections.reverse(rows);

            List<Map<String, Object>> mensajes = rows.stream()
                .filter(r -> r.get("contenido") != null)
                .map(r -> Map.<String, Object>of(
                    "rol",   r.get("rol").toString(),
                    "texto", r.get("contenido").toString()
                ))
                .toList();

            return Map.of("sesionId", sesionIdStr, "mensajes", mensajes);

        } catch (IllegalArgumentException e) {
            return Map.of("sesionId", sesionIdStr, "mensajes", List.of());
        }
    }

    /**
     * Expira una sesión eliminando sus mensajes y adelantando el timestamp de
     * retención para que {@code DataRetentionScheduler} la limpie en el próximo ciclo.
     *
     * Operación idempotente: si la sesión no existe o el UUID es inválido, retorna sin error.
     */
    @Transactional
    void expireSession(String sesionIdStr) {
        if (sesionIdStr == null || sesionIdStr.isBlank()) return;
        try {
            UUID sesionId = UUID.fromString(sesionIdStr.trim());

            jdbc.update(
                "DELETE FROM hot_click_chat_mensaje_shopping_tb WHERE fk_id_sesion = ?::uuid",
                sesionId.toString());

            // Retrocede el timestamp para que DataRetentionScheduler (30 días) la limpie pronto
            jdbc.update(
                "UPDATE hot_click_chat_sesion_tb " +
                "SET ultimo_mensaje_en = NOW() - INTERVAL '31 days' " +
                "WHERE id_sesion = ?::uuid",
                sesionId.toString());

            log.debug("[rag] Sesión expirada manualmente id={}", sesionId);

        } catch (IllegalArgumentException ignored) {
            // UUID inválido — no-op silencioso
        }
    }
}
