package com.hotclick.rag.pipeline;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.service.VectorSearchService;
import com.hotclick.repository.CategoriaRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Núcleo del flujo RAG (Retrieval-Augmented Generation).
 *
 * Secuencia de {@link #ejecutar}:
 *   1. Búsqueda semántica: embed query → top-K productos vía pgvector.
 *   2. Construcción del prompt: XML estructurado con catálogo + reglas anti-alucinación.
 *   3. Llamada no-streaming a Claude Haiku: historial + query + system prompt.
 *   4. Retorna {@link RagResult} con la respuesta y los productos referenciados.
 *
 * Circuit Breaker (Resilience4j "claude"):
 *   Configurado en application.properties — threshold 50 %, ventana 10 llamadas,
 *   espera 15 s en estado abierto.
 *   El fallback retorna un mensaje de contingencia sin llamar al LLM.
 *
 * Dev mode: si {@code anthropic.api-key} está vacío, retorna una respuesta mock
 * para facilitar el desarrollo local sin consumir API quota.
 */
@Component
public class RagPipeline {

    private static final Logger    log      = LoggerFactory.getLogger(RagPipeline.class);
    private static final int       TOP_K    = 5;
    private static final int       MAX_TOKENS = 450;
    private static final Pattern   CATS_TAG  = Pattern.compile("\\[CATS:([^\\]]+)\\]");
    private static final Pattern   OPTS_TAG  = Pattern.compile("\\[OPTS:([^\\]]+)\\]");
    private static final Pattern   PRODS_TAG = Pattern.compile("\\[PRODS:([^\\]]+)\\]");
    private static final HttpClient HTTP    = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String model;

    private final VectorSearchService vectorSearchService;
    private final PromptBuilder       promptBuilder;
    private final ObjectMapper        objectMapper;
    private final CategoriaRepository categoriaRepository;

    public RagPipeline(VectorSearchService vectorSearchService,
                       PromptBuilder promptBuilder,
                       ObjectMapper objectMapper,
                       CategoriaRepository categoriaRepository) {
        this.vectorSearchService  = vectorSearchService;
        this.promptBuilder        = promptBuilder;
        this.objectMapper         = objectMapper;
        this.categoriaRepository  = categoriaRepository;
    }

    // ── Punto de entrada ──────────────────────────────────────────────────────

    /**
     * Ejecuta el pipeline RAG completo.
     *
     * @param query        Pregunta del usuario (ya sanitizada).
     * @param empresaId    ID de la empresa — filtro multi-tenant en vector search.
     * @param empresaNombre Nombre comercial — personaliza el system prompt.
     * @param historial    Últimos N mensajes de la sesión, en formato Claude
     *                     ({@code [{"role":"user","content":"..."},...] }).
     *                     Los roles consecutivos duplicados se filtran internamente.
     */
    @CircuitBreaker(name = "claude", fallbackMethod = "ejecutarFallback")
    public RagResult ejecutar(String query, Long empresaId, String empresaNombre,
                              List<Map<String, Object>> historial, String contexto,
                              String customerMemory) {

        // 1. Búsqueda semántica (degrada graciosamente si Voyage no está disponible)
        List<ProductoContexto> productos = vectorSearchService.buscarSimilares(empresaId, query, TOP_K);

        // 2. Categorías de la empresa para el prompt (best-effort)
        List<String> categorias = fetchCategorias(empresaId);

        // 3. System prompt con catálogo XML + contexto de página + memoria del visitante
        String systemPrompt = promptBuilder.construir(empresaNombre, productos, contexto, customerMemory, categorias);

        // 4. Mensajes para Claude: historial + query actual
        List<Map<String, Object>> messages = buildMessages(historial, query);

        // 5. Llamada a Claude
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("[rag] Dev mode — ANTHROPIC_API_KEY no configurado, retornando mock");
            return mockResponse(productos, categorias, query);
        }

        return llamarClaude(systemPrompt, messages, productos, categorias);
    }

    // ── Fallback de Circuit Breaker ───────────────────────────────────────────

    @SuppressWarnings("unused") // invocado por Resilience4j via reflexión
    RagResult ejecutarFallback(String query, Long empresaId, String empresaNombre,
                               List<Map<String, Object>> historial, String contexto,
                               String customerMemory, Throwable t) {
        log.warn("[rag-circuit] Circuit abierto para empresa={}: {}", empresaId, t.getMessage());
        return RagResult.fallback();
    }

    // ── Llamada a Claude (no-streaming) ──────────────────────────────────────

    private RagResult llamarClaude(String systemPrompt,
                                   List<Map<String, Object>> messages,
                                   List<ProductoContexto> productos,
                                   List<String> categoriasDisponibles) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model",      model);
            body.put("max_tokens", MAX_TOKENS);
            body.put("stream",     false);
            body.put("system",     systemPrompt);
            body.put("messages",   messages);
            // Stop sequences previenen prompt injection
            body.put("stop_sequences", List.of("\n\nHuman:", "\n\nUser:", "Human:", "User:"));

            String requestJson = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.anthropic.com/v1/messages"))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type",      "application/json")
                .header("x-api-key",         apiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new RuntimeException("Claude API HTTP " + response.statusCode() +
                    ": " + response.body());
            }

            JsonNode json    = objectMapper.readTree(response.body());
            String   texto   = json.path("content").path(0).path("text").asText("").trim();
            int      tokIn   = json.path("usage").path("input_tokens").asInt(0);
            int      tokOut  = json.path("usage").path("output_tokens").asInt(0);

            if (texto.isBlank()) {
                log.warn("[rag] Claude devolvió respuesta vacía");
                return RagResult.fallback();
            }

            // Extraer [CATS:...] del texto
            List<String> categoriasSugeridas = List.of();
            Matcher mc = CATS_TAG.matcher(texto);
            if (mc.find()) {
                categoriasSugeridas = Arrays.stream(mc.group(1).split(","))
                    .map(String::trim).filter(s -> !s.isBlank()).limit(5)
                    .collect(Collectors.toList());
                texto = texto.replace(mc.group(0), "").strip();
            }

            // Extraer [OPTS:...]
            List<String> opts = List.of();
            Matcher mo = OPTS_TAG.matcher(texto);
            if (mo.find()) {
                opts = Arrays.stream(mo.group(1).split(","))
                    .map(String::trim).filter(s -> !s.isBlank()).limit(8)
                    .collect(Collectors.toList());
                texto = texto.replace(mo.group(0), "").strip();
            }

            // Extraer [PRODS:sku1,sku2] — Claude decide exactamente qué productos mostrar.
            // Si no hay tag [PRODS:], no se muestran tarjetas (evita mostrar cards cuando
            // Claude está haciendo una pregunta aclaratoria o no hay match relevante).
            List<ProductoContexto> productosAMostrar = List.of();
            Matcher mp = PRODS_TAG.matcher(texto);
            if (mp.find()) {
                Set<String> skusSeleccionados = Arrays.stream(mp.group(1).split(","))
                    .map(s -> s.trim().toUpperCase())
                    .filter(s -> !s.isBlank())
                    .collect(Collectors.toSet());
                productosAMostrar = productos.stream()
                    .filter(p -> p.sku() != null && skusSeleccionados.contains(p.sku().toUpperCase()))
                    .collect(Collectors.toList());
                texto = texto.replace(mp.group(0), "").strip();
            }

            return new RagResult(texto, productosAMostrar, categoriasSugeridas, opts, tokIn, tokOut);

        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Llamada a Claude interrumpida", ie);
        } catch (RuntimeException re) {
            throw re;
        } catch (Exception e) {
            throw new RuntimeException("Error llamando a Claude: " + e.getMessage(), e);
        }
    }

    private List<String> fetchCategorias(Long empresaId) {
        try {
            return categoriaRepository.findByEmpresaIdAndEstado(empresaId, 1)
                .stream()
                .map(c -> c.getNombreCategoria())
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("[rag] No se pudieron cargar categorías empresa={}: {}", empresaId, e.getMessage());
            return List.of();
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Construye el array de mensajes para Claude combinando historial + query actual.
     * Aplica deduplicación de roles consecutivos (Claude requiere alternancia user/assistant).
     */
    private static List<Map<String, Object>> buildMessages(
            List<Map<String, Object>> historial, String query) {

        List<Map<String, Object>> messages = new ArrayList<>();
        String lastRole = null;

        for (Map<String, Object> m : historial) {
            String role    = String.valueOf(m.getOrDefault("role", "")).trim();
            String content = String.valueOf(m.getOrDefault("content", "")).trim();
            if (role.isBlank() || content.isBlank()) continue;
            if (role.equals(lastRole)) continue; // evitar roles consecutivos iguales
            messages.add(Map.of("role", role, "content", content));
            lastRole = role;
        }

        // Claude API exige que el primer mensaje sea "user". Si el historial truncado
        // empieza con "assistant" (ocurre cuando hay más de HISTORY_MESSAGES/2 turnos),
        // se descartan mensajes del inicio hasta encontrar el primer "user".
        while (!messages.isEmpty() && "assistant".equals(messages.get(0).get("role"))) {
            messages.remove(0);
        }

        // La query actual siempre es el último turno de user
        if ("user".equals(lastRole) && !messages.isEmpty()) {
            messages.remove(messages.size() - 1); // evita duplicar si ya hay un user al final
        }
        messages.add(Map.of("role", "user", "content", query));
        return messages;
    }

    private static RagResult mockResponse(List<ProductoContexto> productos, List<String> categorias, String query) {
        String texto = productos.isEmpty()
            ? "*(modo desarrollo)* No encontré productos específicos para tu consulta. ¿Podés describir con más detalle lo que buscás?"
            : "*(modo desarrollo)* Encontré " + productos.size() + " producto(s) relevante(s) para \"" + query + "\". Configurá ANTHROPIC_API_KEY para respuestas reales.";
        return new RagResult(texto, productos, List.of(), List.of(), 0, 0);
    }
}
