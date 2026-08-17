package com.hotclick.service.customermemory;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * Memoria persistente de visitante anónimo.
 *
 * Después de cada turno de conversación relevante, extrae de forma asíncrona
 * los intereses, marcas y presupuesto del cliente usando Claude Haiku y los
 * persiste en {@code customer_memory}. En el siguiente chat, esa memoria se
 * inyecta en el system prompt para que el agente "recuerde" al visitante.
 *
 * La identificación es vía {@code hotclick_visitor_id} (cookie UUID v4, 365 días)
 * sin requerir login.
 */
@Service
public class CustomerMemoryService {

    private static final Logger log = LoggerFactory.getLogger(CustomerMemoryService.class);

    private static final int MAX_INTERESTS = 10;
    private static final int MAX_BRANDS    = 8;

    @Value("${anthropic.api-key:}")
    private String apiKey;

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final CustomerMemoryExtractor extractor;

    public CustomerMemoryService(JdbcTemplate jdbc, ObjectMapper objectMapper,
                                 CustomerMemoryExtractor extractor) {
        this.jdbc         = jdbc;
        this.objectMapper = objectMapper;
        this.extractor    = extractor;
    }

    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Retorna la memoria del visitante. Si no existe, crea un registro vacío.
     * Nunca retorna null.
     */
    public CustomerMemoryDto getOrCreate(String visitorId) {
        if (!CustomerMemoryHelpers.isValidVisitorId(visitorId)) return CustomerMemoryDto.empty(visitorId);

        try {
            return jdbc.queryForObject(
                """
                SELECT visitor_id, summary, interests, preferred_brands, estimated_budget, updated_at
                FROM   customer_memory
                WHERE  visitor_id = ?
                """,
                (rs, rowNum) -> {
                    Timestamp updatedAt = rs.getTimestamp("updated_at");
                    boolean stale = updatedAt == null ||
                        updatedAt.toInstant().isBefore(Instant.now().minus(30, ChronoUnit.DAYS));
                    return new CustomerMemoryDto(
                        rs.getString("visitor_id"),
                        rs.getString("summary"),
                        stale ? List.of() : CustomerMemoryHelpers.parseJsonArray(rs.getString("interests"), objectMapper),
                        stale ? List.of() : CustomerMemoryHelpers.parseJsonArray(rs.getString("preferred_brands"), objectMapper),
                        rs.getObject("estimated_budget", Long.class)
                    );
                },
                visitorId
            );
        } catch (EmptyResultDataAccessException e) {
            // Primera visita — crear registro vacío
            jdbc.update(
                "INSERT INTO customer_memory (visitor_id, last_visit) VALUES (?, NOW()) ON CONFLICT (visitor_id) DO NOTHING",
                visitorId
            );
            return CustomerMemoryDto.empty(visitorId);
        } catch (Exception e) {
            log.warn("[memory] Error cargando memoria visitor={}: {}", visitorId, e.getMessage());
            return CustomerMemoryDto.empty(visitorId);
        }
    }

    /**
     * Actualiza {@code last_visit} del visitante. Llamado al inicio de cada sesión.
     */
    public void touchLastVisit(String visitorId) {
        if (!CustomerMemoryHelpers.isValidVisitorId(visitorId)) return;
        try {
            jdbc.update(
                "UPDATE customer_memory SET last_visit = NOW(), updated_at = NOW() WHERE visitor_id = ?",
                visitorId
            );
        } catch (Exception e) {
            log.warn("[memory] Error actualizando last_visit visitor={}: {}", visitorId, e.getMessage());
        }
    }

    /**
     * Extrae información relevante del último turno y actualiza la memoria de forma asíncrona.
     * No bloquea el hilo del request. Si falla, solo se loguea — nunca propaga excepción.
     *
     * @param visitorId        Cookie del visitante.
     * @param userMessage      Último mensaje del usuario.
     * @param assistantMessage Última respuesta del asistente.
     */
    @Async
    public void updateMemoryAsync(String visitorId, String userMessage, String assistantMessage) {
        if (!CustomerMemoryHelpers.isValidVisitorId(visitorId)) return;
        if (apiKey == null || apiKey.isBlank()) return; // sin API key en dev, silencioso

        try {
            // Cargar memoria existente para hacer merge
            CustomerMemoryDto existing = getOrCreate(visitorId);

            // Llamar a Claude para extraer datos estructurados
            Map<String, Object> extracted = extractor.extractFromConversation(userMessage, assistantMessage);
            if (extracted == null || extracted.isEmpty()) return;

            // Merge de listas (union, sin duplicados, limite máximo)
            List<String> newInterests = CustomerMemoryHelpers.mergeList(
                existing.interests(),
                CustomerMemoryHelpers.castList(extracted.get("interests")),
                MAX_INTERESTS
            );
            List<String> newBrands = CustomerMemoryHelpers.mergeList(
                existing.preferredBrands(),
                CustomerMemoryHelpers.castList(extracted.get("brands")),
                MAX_BRANDS
            );

            // Presupuesto: tomar el más reciente si existe
            Long newBudget = existing.estimatedBudget();
            Object rawBudget = extracted.get("budget_colones");
            if (rawBudget instanceof Number n && n.longValue() > 0) {
                newBudget = n.longValue();
            }

            String newSummary = (String) extracted.get("summary");
            if (newSummary == null || newSummary.isBlank()) newSummary = existing.summary();

            String interestsJson    = objectMapper.writeValueAsString(newInterests);
            String brandsJson       = objectMapper.writeValueAsString(newBrands);

            jdbc.update(
                """
                UPDATE customer_memory
                SET    summary          = ?,
                       interests        = ?::jsonb,
                       preferred_brands = ?::jsonb,
                       estimated_budget = ?,
                       last_visit       = NOW(),
                       updated_at       = NOW()
                WHERE  visitor_id       = ?
                """,
                newSummary, interestsJson, brandsJson, newBudget, visitorId
            );

            log.debug("[memory] Memoria actualizada visitor={} intereses={} marcas={}",
                visitorId, newInterests.size(), newBrands.size());

        } catch (Exception e) {
            log.warn("[memory] Error actualizando memoria visitor={}: {}", visitorId, e.getMessage());
        }
    }
}
