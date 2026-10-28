package com.hotclick.service.customermemory;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
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
     * MEDIO-1: la memoria se aísla por tienda. La clave es (visitorId, empresaId);
     * {@code empresaId == null} es la memoria global de la plataforma (Descubrí).
     * El mismo visitante en la tienda A y en la tienda B tiene memorias separadas.
     * Si no existe, crea un registro vacío. Nunca retorna null.
     */
    public CustomerMemoryDto getOrCreate(Long empresaId, String visitorId) {
        if (!CustomerMemoryHelpers.isValidVisitorId(visitorId)) return CustomerMemoryDto.empty(visitorId);

        try {
            List<CustomerMemoryDto> filas = jdbc.query(
                "SELECT visitor_id, summary, interests, preferred_brands, estimated_budget, updated_at"
                    + " FROM customer_memory WHERE visitor_id = ? AND " + filtroEmpresa(empresaId),
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
                parametros(visitorId, empresaId)
            );
            if (!filas.isEmpty()) return filas.get(0);

            // Primera visita en esta tienda — crear registro vacío (portable H2/Postgres, sin ON CONFLICT).
            try {
                jdbc.update(
                    "INSERT INTO customer_memory (visitor_id, empresa_id, last_visit) VALUES (?, ?, NOW())",
                    visitorId, empresaId
                );
            } catch (DuplicateKeyException carrera) {
                // Otra request creó la fila al mismo tiempo: UNIQUE (visitor_id, empresa_id) la protege.
            }
            return CustomerMemoryDto.empty(visitorId);
        } catch (Exception e) {
            // BAJO: sin visitorId ni e.getMessage() (puede traer SQL/datos del visitante).
            log.warn("[memory] Error cargando memoria empresa={}: {}", empresaId, e.getClass().getSimpleName());
            return CustomerMemoryDto.empty(visitorId);
        }
    }

    /**
     * Actualiza {@code last_visit} del visitante en esa tienda. Llamado al inicio de cada sesión.
     */
    public void touchLastVisit(Long empresaId, String visitorId) {
        if (!CustomerMemoryHelpers.isValidVisitorId(visitorId)) return;
        try {
            jdbc.update(
                "UPDATE customer_memory SET last_visit = NOW(), updated_at = NOW() WHERE visitor_id = ? AND "
                    + filtroEmpresa(empresaId),
                parametros(visitorId, empresaId)
            );
        } catch (Exception e) {
            log.warn("[memory] Error actualizando last_visit empresa={}: {}", empresaId, e.getClass().getSimpleName());
        }
    }

    /** empresa_id = ? para una tienda; IS NULL para la memoria global de la plataforma. */
    private static String filtroEmpresa(Long empresaId) {
        // tenant-global-ok: empresaId null = memoria global de plataforma (Descubrí), nunca otra tienda
        return empresaId == null ? "empresa_id IS NULL" : "empresa_id = ?";
    }

    private static Object[] parametros(String visitorId, Long empresaId) {
        // tenant-global-ok: con empresaId null el filtro es IS NULL (solo fila global), sin parámetro
        return empresaId == null ? new Object[]{visitorId} : new Object[]{visitorId, empresaId};
    }

    /**
     * Extrae información relevante del último turno y actualiza la memoria de forma asíncrona.
     * No bloquea el hilo del request. Si falla, solo se loguea — nunca propaga excepción.
     *
     * @param empresaId        Tienda dueña de la memoria y de los tokens de la extracción (null → plataforma).
     * @param visitorId        Cookie del visitante.
     * @param userMessage      Último mensaje del usuario.
     * @param assistantMessage Última respuesta del asistente.
     */
    @Async
    public void updateMemoryAsync(Long empresaId, String visitorId, String userMessage, String assistantMessage) {
        if (!CustomerMemoryHelpers.isValidVisitorId(visitorId)) return;
        if (apiKey == null || apiKey.isBlank()) return; // sin API key en dev, silencioso

        try {
            // Cargar memoria existente para hacer merge
            CustomerMemoryDto existing = getOrCreate(empresaId, visitorId);

            // Llamar a Claude para extraer datos estructurados
            Map<String, Object> extracted = extractor.extractFromConversation(empresaId, userMessage, assistantMessage);
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
                       interests        = CAST(? AS jsonb),
                       preferred_brands = CAST(? AS jsonb),
                       estimated_budget = ?,
                       last_visit       = NOW(),
                       updated_at       = NOW()
                WHERE  visitor_id       = ?
                """ + " AND " + filtroEmpresa(empresaId),
                empresaId == null
                    ? new Object[]{newSummary, interestsJson, brandsJson, newBudget, visitorId}
                    : new Object[]{newSummary, interestsJson, brandsJson, newBudget, visitorId, empresaId}
            );

            log.debug("[memory] Memoria actualizada empresa={} intereses={} marcas={}",
                empresaId, newInterests.size(), newBrands.size());

        } catch (Exception e) {
            // BAJO: sin visitorId ni e.getMessage() (puede traer SQL/datos del visitante).
            log.warn("[memory] Error actualizando memoria empresa={}: {}", empresaId, e.getClass().getSimpleName());
        }
    }
}
