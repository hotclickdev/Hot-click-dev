package com.hotclick.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.copilot.AiCopilotClaudeClient;
import com.hotclick.service.copilot.AiCopilotContextBuilder;
import com.hotclick.service.copilot.AiCopilotCrossSellService;
import com.hotclick.service.copilot.AiCopilotHistoryService;
import com.hotclick.service.copilot.AiCopilotMessageStore;
import com.hotclick.service.copilot.AiCopilotStreamProcessor;
import com.hotclick.service.copilot.AiCopilotSuggestionsService;
import com.hotclick.service.copilot.AiCopilotSyncChatService;
import com.hotclick.service.copilot.AiCopilotTextoRespuesta;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

/**
 * AI Copilot — Claude (Anthropic) en todos los canales:
 *   - chatStream (panel admin / resumen ejecutivo, SSE)
 *   - chatSync / crossSellCliente (bot de Telegram)
 *
 * NVIDIA NIM queda fuera de este flujo (el tier gratis falló en uso real).
 * TextModerationService sigue filtrando el mensaje en el controller.
 */
@Service
public class AiCopilotService {

    @Autowired private AiQuotaService               aiQuotaService;
    @Autowired private EmpresaRepository            empresaRepository;
    @Autowired private AiCopilotContextBuilder      contextBuilder;
    @Autowired private AiCopilotStreamProcessor     streamProcessor;
    @Autowired private AiCopilotSuggestionsService  suggestionsService;
    @Autowired private AiCopilotHistoryService      historyService;
    @Autowired private AiCopilotMessageStore        messageStore;
    @Autowired private AiCopilotSyncChatService     syncChatService;
    @Autowired private AiCopilotCrossSellService    crossSellService;

    public boolean isEnabled() {
        return syncChatService.claudeDisponible();
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

    public Map<String, Object> getInsights(Long empresaId) {
        return contextBuilder.getInsights(empresaId);
    }

    public List<String> getSugerencias(Long empresaId) {
        return suggestionsService.getSugerencias(empresaId);
    }

    /** Panel admin y resumen ejecutivo: Claude + tools de consulta, respuesta por SSE. */
    @CircuitBreaker(name = "claude", fallbackMethod = "chatStreamFallback")
    public void chatStream(Long empresaId, String userMessage, SseEmitter emitter) {
        Long tenantId = TenantContext.get();
        if (empresaId == null) {
            streamProcessor.sendError(emitter, "Seleccioná un negocio para usar el copilot.");
            return;
        }

        if (!aiQuotaService.verificarYReservar(empresaId)) {
            streamProcessor.sendError(emitter, "Cuota mensual de AI agotada. Actualiza tu plan.");
            return;
        }

        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        messageStore.saveMsg(empresa, "user", userMessage, 0);

        try (AutoCloseable ignored = streamProcessor.startHeartbeat(emitter)) {
            if (!isEnabled()) {
                streamProcessor.streamMock(emitter,
                    "*(modo desarrollo — configura ANTHROPIC_API_KEY para respuestas reales)*\n\n"
                        + "Hola, soy tu copilot de HOTCLICK. ¿En qué te puedo ayudar con tu negocio?");
                messageStore.saveMsg(empresa, "assistant", "Mock response", 0);
                return;
            }
            emitirRespuestaClaude(empresaId, empresa, userMessage, emitter, tenantId);
        } catch (IntegracionExternaException e) {
            throw e;
        } catch (Exception e) {
            throw new IntegracionExternaException("claude-api",
                IntegracionExternaException.Tipo.DESCONOCIDO, tenantId,
                "Fallo en el stream del copilot", e);
        }
    }

    private void emitirRespuestaClaude(Long empresaId, Empresa empresa, String userMessage,
                                       SseEmitter emitter, Long tenantId) {
        try {
            // Panel web: sin tools de mutación (no hay botones de confirmar como en Telegram).
            AiCopilotClaudeClient.ResultadoLoopClaude loop =
                syncChatService.completarConClaude(empresaId, empresa, userMessage, null, false);
            if (loop == null) {
                throw new IntegracionExternaException("claude-api",
                    IntegracionExternaException.Tipo.IO_ERROR, tenantId,
                    "Claude no respondió", null);
            }
            String texto = AiCopilotTextoRespuesta.normalizar(loop.texto(), AiCopilotTextoRespuesta.MAX_CHARS);
            streamProcessor.streamText(emitter, texto);
            messageStore.saveMsg(empresa, "assistant", texto, loop.tokensOut());
            aiQuotaService.actualizarTokens(empresaId, loop.tokensIn(), loop.tokensOut());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IntegracionExternaException("claude-api",
                IntegracionExternaException.Tipo.TIMEOUT, tenantId,
                "Claude interrumpido", e);
        } catch (IntegracionExternaException e) {
            throw e;
        } catch (Exception e) {
            throw new IntegracionExternaException("claude-api",
                IntegracionExternaException.Tipo.DESCONOCIDO, tenantId,
                "Fallo llamando a Claude API", e);
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
