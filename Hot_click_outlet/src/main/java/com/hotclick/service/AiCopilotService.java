package com.hotclick.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.copilot.AiCopilotContextBuilder;
import com.hotclick.service.copilot.AiCopilotCrossSellService;
import com.hotclick.service.copilot.AiCopilotHistoryService;
import com.hotclick.service.copilot.AiCopilotMessageStore;
import com.hotclick.service.copilot.AiCopilotRequestBuilder;
import com.hotclick.service.copilot.AiCopilotStreamProcessor;
import com.hotclick.service.copilot.AiCopilotSuggestionsService;
import com.hotclick.service.copilot.AiCopilotSyncChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * AI Copilot — dos proveedores, uno por canal:
 *   - chatStream (panel admin, SSE) sigue en NVIDIA NIM (OpenAI-compatible).
 *   - chatSync/crossSellCliente (bot de Telegram) usan Claude (Anthropic Messages
 *     API): el tier gratuito de NVIDIA demostró ser intermitentemente lento/no
 *     disponible bajo uso real (ver memoria del proyecto), y Claude ya es
 *     confiable en producción para el asistente de compras de esta misma app.
 *
 * Uses Java 21 HttpClient — no external SDK required.
 * Streams la respuesta del panel via SSE para evitar timeouts de conexión.
 * Cuando la api-key correspondiente está vacía, devuelve una respuesta mock (dev mode).
 *
 * Context injected into every system prompt:
 *   - Empresa name, plan, country
 *   - Last 7 days KPIs (orders, revenue, top products)
 *   - Low-stock alerts
 */
@Service
public class AiCopilotService {

    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    // Apunta directo a NVIDIA NIM por defecto. Para pasar por el sidecar de
    // NeMo Guardrails (security-tools/guardrails/), setear NVIDIA_BASE_URL=
    // http://guardrails:8001/v1/ — ver security-tools/guardrails/README.md.
    @Value("${nvidia.base-url}chat/completions")
    private String nvidiaUrl;

    @Value("${nvidia.api-key:}")
    private String apiKey;

    @Autowired private AiQuotaService               aiQuotaService;
    @Autowired private EmpresaRepository            empresaRepository;
    @Autowired private AiCopilotContextBuilder      contextBuilder;
    @Autowired private AiCopilotRequestBuilder      requestBuilder;
    @Autowired private AiCopilotStreamProcessor     streamProcessor;
    @Autowired private AiCopilotSuggestionsService  suggestionsService;
    @Autowired private AiCopilotHistoryService      historyService;
    @Autowired private AiCopilotMessageStore        messageStore;
    @Autowired private AiCopilotSyncChatService     syncChatService;
    @Autowired private AiCopilotCrossSellService    crossSellService;

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    public List<Map<String, Object>> getHistorial(Long empresaId) {
        return historyService.getHistorial(empresaId);
    }

    public void limpiarHistorial(Long empresaId) {
        historyService.limpiarHistorial(empresaId);
    }

    public List<Map<String, Object>> getProductosSinVentaAccionables(Long empresaId) {
        return contextBuilder.getProductosSinVentaAccionables(empresaId);
    }

    public List<String> getSugerencias(Long empresaId) {
        return suggestionsService.getSugerencias(empresaId);
    }

    /** Main streaming endpoint: NVIDIA reply via SSE. */
    @CircuitBreaker(name = "nvidia", fallbackMethod = "chatStreamFallback")
    public void chatStream(Long empresaId, String userMessage, SseEmitter emitter) {
        // TenantContext sobrevive el salto a sseExecutor (TenantAwareTaskDecorator),
        // pero NO sobrevive al callback de HttpClient.sendAsync más abajo — ese corre
        // en un hilo propio del HttpClient. Por eso se captura aquí y se pasa explícito.
        Long tenantId = TenantContext.get();

        // Reserva slot atómicamente antes del HTTP call — elimina race condition TOCTOU
        if (!aiQuotaService.verificarYReservar(empresaId)) {
            streamProcessor.sendError(emitter, "Cuota mensual de AI agotada. Actualiza tu plan.");
            return;
        }

        // Save user message
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        messageStore.saveMsg(empresa, "user", userMessage, 0);

        if (!isEnabled()) {
            // Mock mode for development
            streamProcessor.streamMock(emitter, "*(modo desarrollo — configura NVIDIA_API_KEY para respuestas reales)*\n\nHola, soy tu copilot de HOTCLICK. ¿En qué te puedo ayudar con tu negocio?");
            messageStore.saveMsg(empresa, "assistant", "Mock response", 0);
            return;
        }

        try {
            AiCopilotContextBuilder.Intent intent = contextBuilder.detectIntent(userMessage);

            // Build messages array para NVIDIA (formato OpenAI chat completions)
            List<Map<String, Object>> messages = requestBuilder.buildMessages(empresaId, userMessage);
            String systemPrompt = contextBuilder.buildSystemPrompt(empresaId, intent);
            String requestBody  = requestBuilder.buildRequestBody(systemPrompt, messages, tenantId);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(nvidiaUrl))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .header("Accept", "text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                .build();

            HTTP.sendAsync(request, HttpResponse.BodyHandlers.ofLines())
                .thenAccept(response -> streamProcessor.processStream(response, emitter, empresa, empresaId, messageStore::saveMsg))
                .exceptionally(ex -> {
                    streamProcessor.reportNvidiaFailure(AiCopilotStreamProcessor.unwrap(ex), tenantId, emitter);
                    return null;
                });
        } catch (IntegracionExternaException e) {
            streamProcessor.reportNvidiaFailure(e, tenantId, emitter);
        }
    }

    /** Variante síncrona (sin SSE) — hoy la usa el bot de Telegram. */
    public String chatSync(Long empresaId, String userMessage) {
        return syncChatService.chatSync(empresaId, userMessage);
    }

    public String chatSync(Long empresaId, String userMessage, String nombreUsuario) {
        return syncChatService.chatSync(empresaId, userMessage, nombreUsuario);
    }

    /**
     * Texto del modelo más, si aplica, una {@link AccionPropuestaTelegram} pendiente
     * de confirmación. Nunca viene ya ejecutada.
     */
    public record ChatConAccionesResultado(String texto, AccionPropuestaTelegram accionPropuesta) {}

    public ChatConAccionesResultado chatSyncConAcciones(Long empresaId, String userMessage,
                                                         String nombreUsuario, boolean puedeGestionar) {
        return syncChatService.chatSyncConAcciones(empresaId, userMessage, nombreUsuario, puedeGestionar);
    }

    public String crossSellCliente(Long empresaId, Long clienteId) {
        return crossSellService.crossSellCliente(empresaId, clienteId);
    }

    /** Resilience4j exige el fallback en la misma clase que {@link #chatStream}. */
    @SuppressWarnings("unused")
    private void chatStreamFallback(Long empresaId, String userMessage, SseEmitter emitter, Throwable t) {
        streamProcessor.chatStreamFallback(empresaId, userMessage, emitter, t);
    }
}
