package com.hotclick.rag.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.text.NumberFormat;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

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

    private static final int     MAX_INTERESTS = 10;
    private static final int     MAX_BRANDS    = 8;
    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String model;

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public CustomerMemoryService(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc         = jdbc;
        this.objectMapper = objectMapper;
    }

    // ── DTO interno ───────────────────────────────────────────────────────────

    public record CustomerMemoryDto(
        String       visitorId,
        String       summary,
        List<String> interests,
        List<String> preferredBrands,
        Long         estimatedBudget
    ) {
        public static CustomerMemoryDto empty(String visitorId) {
            return new CustomerMemoryDto(visitorId, null, List.of(), List.of(), null);
        }

        public boolean hasContent() {
            return (summary != null && !summary.isBlank())
                || !interests.isEmpty()
                || !preferredBrands.isEmpty()
                || estimatedBudget != null;
        }

        /** Formatea la memoria como bloque XML para inyectar en el system prompt. */
        public String toXmlBlock() {
            if (!hasContent()) return "";
            StringBuilder sb = new StringBuilder("<memoria_cliente>\n");
            if (summary != null && !summary.isBlank())
                sb.append("  <resumen>").append(xmlEscape(summary)).append("</resumen>\n");
            if (!interests.isEmpty())
                sb.append("  <intereses>").append(xmlEscape(String.join(", ", interests))).append("</intereses>\n");
            if (!preferredBrands.isEmpty())
                sb.append("  <marcas_preferidas>").append(xmlEscape(String.join(", ", preferredBrands))).append("</marcas_preferidas>\n");
            if (estimatedBudget != null && estimatedBudget > 0) {
                NumberFormat fmt = NumberFormat.getInstance(Locale.forLanguageTag("es-CR"));
                sb.append("  <presupuesto_estimado>₡").append(fmt.format(estimatedBudget)).append("</presupuesto_estimado>\n");
            }
            sb.append("</memoria_cliente>\n");
            return sb.toString();
        }
    }

    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Retorna la memoria del visitante. Si no existe, crea un registro vacío.
     * Nunca retorna null.
     */
    public CustomerMemoryDto getOrCreate(String visitorId) {
        if (!isValidVisitorId(visitorId)) return CustomerMemoryDto.empty(visitorId);

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
                        stale ? List.of() : parseJsonArray(rs.getString("interests")),
                        stale ? List.of() : parseJsonArray(rs.getString("preferred_brands")),
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
        if (!isValidVisitorId(visitorId)) return;
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
        if (!isValidVisitorId(visitorId)) return;
        if (apiKey == null || apiKey.isBlank()) return; // sin API key en dev, silencioso

        try {
            // Cargar memoria existente para hacer merge
            CustomerMemoryDto existing = getOrCreate(visitorId);

            // Llamar a Claude para extraer datos estructurados
            Map<String, Object> extracted = extractFromConversation(userMessage, assistantMessage);
            if (extracted == null || extracted.isEmpty()) return;

            // Merge de listas (union, sin duplicados, limite máximo)
            List<String> newInterests = mergeList(
                existing.interests(),
                castList(extracted.get("interests")),
                MAX_INTERESTS
            );
            List<String> newBrands = mergeList(
                existing.preferredBrands(),
                castList(extracted.get("brands")),
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

    // ── Extracción via Claude Haiku ───────────────────────────────────────────

    private Map<String, Object> extractFromConversation(String userMsg, String assistantMsg) {
        try {
            String systemPrompt = """
                Sos un extractor de datos de cliente. A partir de un fragmento de conversación \
                de una tienda en Costa Rica, extraé información estructurada del cliente.
                Devolvé SOLO JSON válido con estos campos:
                - "interests": array de strings con categorías o productos mencionados (en español, minúsculas)
                - "brands": array de strings con marcas mencionadas o preferidas
                - "budget_colones": número entero en colones costarricenses o null
                - "summary": una oración en español resumiendo qué busca este cliente

                Si no hay información relevante, devolvé: {"interests":[],"brands":[],"budget_colones":null,"summary":""}
                NO incluyas explicaciones. SOLO el JSON.
                """;

            String userContent = "Conversación:\nUsuario: " + truncate(userMsg, 300) +
                "\nAsistente: " + truncate(assistantMsg, 300);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model",      model);
            body.put("max_tokens", 256);
            body.put("system",     systemPrompt);
            body.put("messages",   List.of(Map.of("role", "user", "content", userContent)));

            String requestJson = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.anthropic.com/v1/messages"))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type",      "application/json")
                .header("x-api-key",         apiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) return null;

            JsonNode json  = objectMapper.readTree(response.body());
            String   texto = json.path("content").path(0).path("text").asText("").trim();

            if (texto.isBlank()) return null;

            // Limpiar markdown si Claude envuelve en backticks
            texto = texto.replaceAll("^```json\\s*", "").replaceAll("```$", "").trim();

            JsonNode parsed = objectMapper.readTree(texto);
            Map<String, Object> result = new HashMap<>();

            JsonNode interestsNode = parsed.path("interests");
            if (interestsNode.isArray()) {
                List<String> list = new ArrayList<>();
                interestsNode.forEach(n -> { if (!n.asText().isBlank()) list.add(n.asText().toLowerCase()); });
                result.put("interests", list);
            }

            JsonNode brandsNode = parsed.path("brands");
            if (brandsNode.isArray()) {
                List<String> list = new ArrayList<>();
                brandsNode.forEach(n -> { if (!n.asText().isBlank()) list.add(n.asText()); });
                result.put("brands", list);
            }

            JsonNode budgetNode = parsed.path("budget_colones");
            if (!budgetNode.isNull() && budgetNode.isNumber()) {
                result.put("budget_colones", budgetNode.longValue());
            }

            String summary = parsed.path("summary").asText("");
            if (!summary.isBlank()) result.put("summary", summary);

            return result;

        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.warn("[memory] Error en extracción Claude: {}", e.getMessage());
            return null;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static boolean isValidVisitorId(String visitorId) {
        if (visitorId == null || visitorId.isBlank()) return false;
        try { UUID.fromString(visitorId); return true; }
        catch (IllegalArgumentException e) { return false; }
    }

    private List<String> parseJsonArray(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            JsonNode node = objectMapper.readTree(json);
            if (!node.isArray()) return List.of();
            List<String> list = new ArrayList<>();
            node.forEach(n -> list.add(n.asText()));
            return Collections.unmodifiableList(list);
        } catch (Exception e) {
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private static List<String> castList(Object obj) {
        if (obj instanceof List<?> l) return (List<String>) l;
        return List.of();
    }

    private static List<String> mergeList(List<String> existing, List<String> incoming, int maxSize) {
        Set<String> seen = new LinkedHashSet<>(existing);
        seen.addAll(incoming);
        List<String> merged = new ArrayList<>(seen);
        if (merged.size() > maxSize) merged = merged.subList(0, maxSize);
        return Collections.unmodifiableList(merged);
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    private static String xmlEscape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
