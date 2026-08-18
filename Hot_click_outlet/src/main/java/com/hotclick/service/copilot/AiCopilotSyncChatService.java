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

    public boolean claudeDisponible() {
        return isClaudeEnabled();
    }

    /**
     * Claude + tools. No reserva cuota ni persiste mensajes.
     * En el panel web usar {@code puedeGestionar=false}: las mutaciones
     * dependen de botones de confirmación de Telegram.
     */
    public AiCopilotClaudeClient.ResultadoLoopClaude completarConClaude(
            Long empresaId, Empresa empresa, String userMessage,
            String nombreUsuario, boolean puedeGestionar)
            throws java.io.IOException, InterruptedException {
        List<Map<String, Object>> messages = requestBuilder.buildMessages(empresaId, userMessage);
        String systemPrompt = toolExecutor.buildSystemPromptConTools(
            empresaId, empresa, nombreUsuario, puedeGestionar);
        List<Map<String, Object>> tools = toolExecutor.buildTools(empresaId, puedeGestionar);
        return claudeClient.ejecutarLoopClaude(empresaId, systemPrompt, messages, tools);
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
            AiCopilotClaudeClient.ResultadoLoopClaude loop =
                completarConClaude(empresaId, empresa, userMessage, nombreUsuario, puedeGestionar);
            if (loop == null) return null;

            String texto = AiCopilotTextoRespuesta.normalizar(loop.texto(), AiCopilotTextoRespuesta.MAX_CHARS);
            messageStore.saveMsg(empresa, "assistant", texto, loop.tokensOut());
            aiQuotaService.actualizarTokens(empresaId, loop.tokensIn(), loop.tokensOut());
            return new ChatConAccionesResultado(texto, loop.accionPropuesta());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.error("[AI-sync] empresaId={} fallo llamando a Claude — {}", empresaId, e.getMessage());
            return null;
        }
    }
}
