package com.hotclick.rag.pipeline;

import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.prompt.PromptBuilder;
import com.hotclick.rag.service.VectorSearchService;
import com.hotclick.repository.CategoriaRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;
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
    private static final HttpClient HTTP    = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String model;

    private final VectorSearchService vectorSearchService;
    private final PromptBuilder       promptBuilder;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final CategoriaRepository categoriaRepository;

    public RagPipeline(VectorSearchService vectorSearchService,
                       PromptBuilder promptBuilder,
                       com.fasterxml.jackson.databind.ObjectMapper objectMapper,
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
                              String customerMemory, boolean marketplace, Long productoId) {

        boolean asesorFicha = productoId != null && productoId > 0;
        List<ProductoContexto> productos = asesorFicha
            ? vectorSearchService.buscarPorId(empresaId, productoId, marketplace)
            : vectorSearchService.buscarSimilares(empresaId, query, TOP_K, marketplace);

        List<String> categorias = asesorFicha ? List.of() : fetchCategorias(empresaId, marketplace);

        String systemPrompt = promptBuilder.construir(
            empresaNombre, productos, contexto, customerMemory, categorias, asesorFicha);

        List<Map<String, Object>> messages = RagPipelineSupport.buildMessages(historial, query);

        if (apiKey == null || apiKey.isBlank()) {
            log.debug("[rag] Dev mode — ANTHROPIC_API_KEY no configurado, retornando mock");
            return RagPipelineSupport.mockResponse(productos, categorias, query);
        }

        return RagClaudeCaller.llamar(HTTP, objectMapper, apiKey, model, MAX_TOKENS,
            systemPrompt, messages, productos, categorias);
    }

    @SuppressWarnings("unused")
    RagResult ejecutarFallback(String query, Long empresaId, String empresaNombre,
                               List<Map<String, Object>> historial, String contexto,
                               String customerMemory, boolean marketplace, Long productoId, Throwable t) {
        log.warn("[rag-circuit] Circuit abierto para empresa={}: {}", empresaId, t.getMessage());
        return RagResult.fallback();
    }

    private List<String> fetchCategorias(Long empresaId, boolean marketplace) {
        try {
            var cats = marketplace
                ? categoriaRepository.findPublicasByEstado(1)
                : categoriaRepository.findByEmpresaIdOrNoEmpresaAndEstado(empresaId, 1);
            return cats.stream()
                .map(c -> c.getNombreCategoria())
                .filter(n -> n != null && !n.isBlank())
                .distinct()
                .limit(15)
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("[rag] No se pudieron cargar categorías empresa={}: {}", empresaId, e.getMessage());
            return List.of();
        }
    }
}
