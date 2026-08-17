package com.hotclick.service.copilot;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.AiQuotaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

import static com.hotclick.service.AiCopilotService.ChatConAccionesResultado;

/**
 * Chat síncrono del Copilot (bot de Telegram) vía Claude.
 * Extraído bit-idéntico de AiCopilotService — no cambia comportamiento.
 */
@Service
public class AiCopilotSyncChatService {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotSyncChatService.class);
    private static final int    MAX_RESPONSE_CHARS = 8_000;  // hard cap — stops runaway stream output loops

    @Value("${anthropic.api-key:}")
    private String claudeApiKey;

    @Autowired private EmpresaRepository        empresaRepository;
    @Autowired private AiQuotaService           aiQuotaService;
    @Autowired private AiCopilotRequestBuilder  requestBuilder;
    @Autowired private AiCopilotToolExecutor    toolExecutor;
    @Autowired private AiCopilotClaudeClient    claudeClient;
    @Autowired private AiCopilotMessageStore    messageStore;

    private boolean isClaudeEnabled() {
        return claudeApiKey != null && !claudeApiKey.isBlank();
    }

    /**
     * Variante síncrona (sin SSE) para canales que necesitan la respuesta completa
     * en un solo string — hoy la usa el bot de Telegram.
     *
     * Reserva cuota igual que chatStream (verificarYReservar antes del call).
     * Retorna {@code null} cuando el PROVEEDOR de IA falló (timeout/HTTP error) —
     * el caller decide su propio fallback. Cuota agotada y modo-desarrollo sí
     * devuelven mensaje, porque son respuestas definitivas, no fallos transitorios.
     */
    public String chatSync(Long empresaId, String userMessage) {
        return chatSync(empresaId, userMessage, null);
    }

    /** Variante con el nombre del usuario que escribe (Telegram) para personalizar el saludo/tono. */
    public String chatSync(Long empresaId, String userMessage, String nombreUsuario) {
        ChatConAccionesResultado r = chatSyncInterno(empresaId, userMessage, nombreUsuario, false);
        return r != null ? r.texto() : null;
    }

    /**
     * Igual que {@link #chatSync}, pero cuando {@code puedeGestionar} es true expone
     * además herramientas de mutación (proponer_*) que el modelo puede usar para
     * proponer una acción — nunca para ejecutarla directamente (ver AccionPropuestaTelegram).
     */
    public ChatConAccionesResultado chatSyncConAcciones(Long empresaId, String userMessage,
                                                         String nombreUsuario, boolean puedeGestionar) {
        return chatSyncInterno(empresaId, userMessage, nombreUsuario, puedeGestionar);
    }

    private ChatConAccionesResultado chatSyncInterno(Long empresaId, String userMessage,
                                                       String nombreUsuario, boolean puedeGestionar) {
        if (!aiQuotaService.verificarYReservar(empresaId)) {
            return new ChatConAccionesResultado(
                "Se agotó la cuota mensual de consultas con IA de tu plan. Podés seguir usando los botones del menú (/menu), que no consumen cuota.",
                null);
        }

        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        messageStore.saveMsg(empresa, "user", userMessage, 0);

        if (!isClaudeEnabled()) {
            String mock = "(modo desarrollo — configurá ANTHROPIC_API_KEY para respuestas reales)\n\nHola, soy tu copilot de HotClick. ¿En qué te ayudo con tu negocio?";
            messageStore.saveMsg(empresa, "assistant", mock, 0);
            return new ChatConAccionesResultado(mock, null);
        }

        try {
            List<Map<String, Object>> messages = requestBuilder.buildMessages(empresaId, userMessage);
            String systemPrompt = toolExecutor.buildSystemPromptConTools(empresaId, empresa, nombreUsuario, puedeGestionar);
            List<Map<String, Object>> tools = toolExecutor.buildTools(empresaId, puedeGestionar);

            AiCopilotClaudeClient.ResultadoLoopClaude loop = claudeClient.ejecutarLoopClaude(empresaId, systemPrompt, messages, tools);
            if (loop == null) return null; // fallo de proveedor — el caller decide su fallback

            String texto = loop.texto();
            if (texto == null || texto.isBlank()) {
                texto = "No pude generar una respuesta. Probá reformular la pregunta.";
            }
            if (texto.length() > MAX_RESPONSE_CHARS) texto = texto.substring(0, MAX_RESPONSE_CHARS);

            messageStore.saveMsg(empresa, "assistant", texto, loop.tokensOut());
            aiQuotaService.actualizarTokens(empresaId, loop.tokensIn(), loop.tokensOut());
            return new ChatConAccionesResultado(texto, loop.accionPropuesta());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.error("[AI-sync] empresaId={} fallo llamando a NVIDIA — {}", empresaId, e.getMessage());
            return null;
        }
    }
}
