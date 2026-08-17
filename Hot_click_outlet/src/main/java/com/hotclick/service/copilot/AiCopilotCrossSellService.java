package com.hotclick.service.copilot;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Sugerencia de cross-sell para un cliente puntual (bot de Telegram).
 * Extraído bit-idéntico de AiCopilotService — no cambia comportamiento.
 */
@Service
public class AiCopilotCrossSellService {

    @Value("${anthropic.api-key:}")
    private String claudeApiKey;

    @Autowired private AiCopilotCrossSellContextLoader contextLoader;
    @Autowired private AiCopilotCrossSellClaudeCaller claudeCaller;

    private boolean isClaudeEnabled() {
        return claudeApiKey != null && !claudeApiKey.isBlank();
    }

    /**
     * Sugerencia de cross-sell para un cliente puntual — la usa el flujo de
     * "Clientes" del bot de Telegram (TelegramFlujoService.sugerirCrossSellAsync)
     * para redactar 2-3 productos que ofrecerle según lo que ya compró.
     *
     * Es una llamada puntual, no una conversación: no consume el historial de
     * hot_click_ai_mensaje_tb ni escribe en él. Retorna {@code null} si la IA
     * no está disponible o no hay suficiente historial/candidatos para sugerir —
     * el caller cae a su propio fallback SQL.
     */
    public String crossSellCliente(Long empresaId, Long clienteId) {
        if (!isClaudeEnabled()) return null;

        AiCopilotCrossSellContextLoader.CrossSellContext ctx = contextLoader.cargar(empresaId, clienteId);
        if (ctx == null) return null;

        String datosPrompt = contextLoader.armarDatosPrompt(ctx);
        return claudeCaller.solicitarSugerencia(empresaId, clienteId, datosPrompt);
    }
}
