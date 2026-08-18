package com.hotclick.rag.controller;

import com.hotclick.model.Empresa;
import com.hotclick.rag.classifier.AssistantMetricsService;
import com.hotclick.rag.controller.shoppingassistant.ShoppingAssistantImageSearchHandler;
import com.hotclick.rag.controller.shoppingassistant.ShoppingAssistantTenantGuard;
import com.hotclick.rag.dto.ChatRequest;
import com.hotclick.rag.dto.ChatResponse;
import com.hotclick.rag.dto.FeedbackRequest;
import com.hotclick.service.catalogo.MarketplaceCatalogo;
import com.hotclick.service.shoppingassistant.ShoppingAssistantService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

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

    private final ShoppingAssistantService           assistantService;
    private final AssistantMetricsService            metricsService;
    private final ShoppingAssistantTenantGuard       tenantGuard;
    private final ShoppingAssistantImageSearchHandler imageSearchHandler;

    public ShoppingAssistantController(ShoppingAssistantService assistantService,
                                       AssistantMetricsService metricsService,
                                       ShoppingAssistantTenantGuard tenantGuard,
                                       ShoppingAssistantImageSearchHandler imageSearchHandler) {
        this.assistantService    = assistantService;
        this.metricsService      = metricsService;
        this.tenantGuard         = tenantGuard;
        this.imageSearchHandler  = imageSearchHandler;
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
        Empresa empresa = tenantGuard.requireEmpresaActiva(request.getEmpresaSlug());

        String empresaNombre = ShoppingAssistantTenantGuard.nombreComercial(empresa);

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
            request.getVisitorId(),
            MarketplaceCatalogo.esMarketplace(request.getEmpresaSlug()),
            request.getProductoId()
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
        return imageSearchHandler.searchByImage(image, empresaSlug, visitorId);
    }

    /**
     * Retorna el historial de mensajes de una sesión para re-sincronizar el contexto
     * en page reload o cuando CartAssistant necesita leer las búsquedas previas.
     *
     * <p>El {@code sesionId} (UUID v4) es el único credential; endpoint público.
     */
    @GetMapping("/session/{sesionId}/history")
    public ResponseEntity<Map<String, Object>> getHistory(@PathVariable String sesionId) {
        Map<String, Object> result = assistantService.getSessionHistory(sesionId);
        return ResponseEntity.ok(result);
    }

    /**
     * Expira una sesión eliminando sus mensajes del backend.
     * Llamado por el frontend cuando el temporizador de inactividad de 10 min dispara.
     * Idempotente: si la sesión no existe retorna 204 sin error.
     */
    @DeleteMapping("/session/{sesionId}")
    public ResponseEntity<Void> expireSession(@PathVariable String sesionId) {
        assistantService.expireSession(sesionId);
        return ResponseEntity.noContent().build();
    }

    // Feedback de mensajes — publico, sin auth, best-effort
    @PostMapping("/feedback")
    public ResponseEntity<Void> feedback(@Valid @RequestBody FeedbackRequest request) {
        assistantService.submitFeedback(
            request.getSesionId(), request.getMsgIndex(), request.getRating());
        return ResponseEntity.noContent().build();
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
