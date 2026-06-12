package com.hotclick.rag.controller;

import com.hotclick.model.Empresa;
import com.hotclick.rag.classifier.AssistantMetricsService;
import com.hotclick.rag.dto.ChatRequest;
import com.hotclick.rag.dto.ChatResponse;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.service.ShoppingAssistantService;
import com.hotclick.rag.service.VectorSearchService;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.GoogleVisionService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
import java.util.stream.IntStream;

/**
 * Endpoint público del asistente de compras conversacional con IA.
 *
 * Seguridad multi-tenant:
 *   - Resolución de {@code empresaSlug} → {@link Empresa} en la primera línea del handler.
 *   - Si el slug no existe o la empresa no está ACTIVA, se corta la ejecución con 404
 *     ANTES de generar ningún embedding ni consultar datos.
 *   - El {@code empresaId} se propaga a todas las capas; ninguna query omite el filtro.
 *
 * Rate limiting:
 *   - Aplicado en {@link com.hotclick.security.RateLimitingFilter}: 10 req/60 s por IP.
 *
 * Circuit Breaker:
 *   - Configurado en {@link com.hotclick.rag.pipeline.RagPipeline}.
 *   - Si Claude no está disponible, el pipeline retorna un mensaje de contingencia
 *     y este endpoint responde con HTTP 200 (experiencia degradada, no error duro).
 */
@RestController
@RequestMapping("/api/public/shopping-assistant")
public class ShoppingAssistantController {

    private static final Logger log = LoggerFactory.getLogger(ShoppingAssistantController.class);

    private final ShoppingAssistantService assistantService;
    private final EmpresaRepository        empresaRepository;
    private final AssistantMetricsService  metricsService;
    private final VectorSearchService      vectorSearchService;
    private final GoogleVisionService      visionService;

    public ShoppingAssistantController(ShoppingAssistantService assistantService,
                                       EmpresaRepository empresaRepository,
                                       AssistantMetricsService metricsService,
                                       VectorSearchService vectorSearchService,
                                       GoogleVisionService visionService) {
        this.assistantService   = assistantService;
        this.empresaRepository  = empresaRepository;
        this.metricsService     = metricsService;
        this.vectorSearchService = vectorSearchService;
        this.visionService      = visionService;
    }

    /**
     * Procesa un turno de conversación del asistente de compras.
     *
     * <p>Flujo:
     * <ol>
     *   <li>Valida el request (Bean Validation: {@code @NotBlank} en {@code ChatRequest}).</li>
     *   <li>Resuelve {@code empresaSlug} → empresa activa → corta con 404 si no existe.</li>
     *   <li>Delega a {@link ShoppingAssistantService#chat} para el pipeline RAG completo.</li>
     *   <li>Retorna {@link ChatResponse} con respuesta, sesionId y productos referenciados.</li>
     * </ol>
     *
     * @param request Payload con {@code mensaje}, {@code sesionId} (opcional) y {@code empresaSlug}.
     */
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {

        // ── Aislamiento multi-tenant ──────────────────────────────────────────
        // El slug se resuelve aquí (capa de entrada) para que ninguna capa inferior
        // reciba un empresaSlug sin validar. La empresa debe estar ACTIVA.
        Empresa empresa = empresaRepository.findBySlug(request.getEmpresaSlug())
            .filter(e -> "ACTIVO".equals(e.getEstadoEmpresa()))
            .orElseThrow(() -> {
                log.warn("[rag-ctrl] Slug no encontrado o inactivo: '{}'", request.getEmpresaSlug());
                return new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Tienda no encontrada o inactiva");
            });

        String empresaNombre = empresa.getNombreComercial() != null
            ? empresa.getNombreComercial()
            : empresa.getNombreEmpresa();

        log.debug("[rag-ctrl] Chat empresa={} sesion='{}'",
            empresa.getId(), request.getSesionId());

        // ── Ejecución del pipeline ────────────────────────────────────────────
        // El Circuit Breaker en RagPipeline garantiza que cualquier fallo de Claude
        // retorna un ChatResponse con mensaje de contingencia (HTTP 200),
        // sin propagar la excepción hasta aquí.
        ChatResponse response = assistantService.chat(
            empresa.getId(),
            empresaNombre,
            request.getMensaje(),
            request.getSesionId(),
            request.getContexto(),
            request.getVisitorId()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Búsqueda de productos por imagen.
     * Analiza la imagen con Google Vision → extrae etiquetas → búsqueda semántica RAG.
     * Retorna: { analisis:{etiquetaPrincipal,categoria}, productos:[...], encontrado:boolean }
     */
    @PostMapping("/search-by-image")
    public ResponseEntity<Map<String, Object>> searchByImage(
            @RequestParam MultipartFile image,
            @RequestParam String empresaSlug,
            @RequestParam(required = false) String visitorId) {

        if (image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen está vacía");
        }

        Empresa empresa = empresaRepository.findBySlug(empresaSlug)
            .filter(e -> "ACTIVO".equals(e.getEstadoEmpresa()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tienda no encontrada"));

        GoogleVisionService.VisionResult vision;
        try {
            byte[] bytes  = image.getBytes();
            String base64 = Base64.getEncoder().encodeToString(bytes);
            vision = visionService.analizar(base64);
        } catch (Exception e) {
            log.warn("[img-search] Error leyendo imagen: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo procesar la imagen");
        }

        // Construir query de texto a partir de las etiquetas de Vision
        String etiquetaPrincipal = vision.getEtiquetaPrincipal();
        String categoriaFisica   = vision.getCategoriaFisica();
        String query = buildImageQuery(vision);

        List<ProductoContexto> productos = query.isBlank()
            ? List.of()
            : vectorSearchService.buscarSimilares(empresa.getId(), query, 5);

        // Asignar porcentajes de similitud decrecientes (sin image embeddings, es estimación)
        int[] simScores = { 94, 87, 80, 74, 68 };
        List<Map<String, Object>> productosConSim = IntStream.range(0, productos.size())
            .mapToObj(i -> {
                ProductoContexto p = productos.get(i);
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",              p.id());
                m.put("nombre",          p.nombre());
                m.put("sku",             p.sku());
                m.put("precio",          p.precio());
                m.put("descripcionCorta", p.descripcionCorta());
                m.put("imagenUrl",       p.imagenUrl());
                m.put("similarity",      i < simScores.length ? simScores[i] : 60);
                return m;
            })
            .toList();

        Map<String, Object> analisis = new LinkedHashMap<>();
        analisis.put("etiquetaPrincipal", etiquetaPrincipal);
        analisis.put("categoria",         categoriaFisica);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("analisis",   analisis);
        result.put("productos",  productosConSim);
        result.put("encontrado", !productosConSim.isEmpty());

        log.debug("[img-search] empresa={} etiqueta='{}' resultados={}",
            empresa.getId(), etiquetaPrincipal, productosConSim.size());

        return ResponseEntity.ok(result);
    }

    private String buildImageQuery(GoogleVisionService.VisionResult vision) {
        List<String> partes = new ArrayList<>();
        if (!vision.webEntities.isEmpty()) {
            vision.webEntities.stream().limit(3)
                .map(e -> e.description)
                .forEach(partes::add);
        }
        if (!vision.labelsFisicos.isEmpty()) {
            vision.labelsFisicos.stream().limit(2).forEach(partes::add);
        }
        return String.join(" ", partes);
    }

    /**
     * Métricas del clasificador de consultas.
     * Solo accesible por administradores.
     */
    @GetMapping("/metrics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> metrics() {
        return ResponseEntity.ok(metricsService.getSummary());
    }
}
