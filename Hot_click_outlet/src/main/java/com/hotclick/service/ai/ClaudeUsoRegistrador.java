package com.hotclick.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.service.AiQuotaService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Persiste los tokens (entrada, salida y caché) de cualquier llamada a Claude en
 * {@code hot_click_ai_uso_tb}. Best-effort: nunca propaga excepciones (registrar el costo no
 * debe tumbar la respuesta al usuario). Sin tenant conocido, el costo se atribuye a la plataforma.
 */
@Component
public class ClaudeUsoRegistrador {

    private static final Logger log = LoggerFactory.getLogger(ClaudeUsoRegistrador.class);

    private final AiQuotaService aiQuotaService;

    public ClaudeUsoRegistrador(AiQuotaService aiQuotaService) {
        this.aiQuotaService = aiQuotaService;
    }

    /** Registra el nodo {@code usage} de una respuesta de Claude. */
    public void registrar(Long empresaId, JsonNode usage) {
        registrar(empresaId, UsoTokens.desdeUsage(usage));
    }

    public void registrar(Long empresaId, UsoTokens uso) {
        if (uso == null || uso.esVacio()) return;
        // tenant-global-ok: solo escritura de consumo; sin empresa (llamadas de plataforma) se acumula en la empresa plataforma y nada se lee entre tenants
        Long destino = empresaId != null ? empresaId : Constants.EMPRESA_PLATAFORMA_ID;
        try {
            aiQuotaService.actualizarTokens(destino, uso);
        } catch (RuntimeException e) {
            // Sin mensaje: puede traer SQL o datos del visitante.
            log.warn("[ai-uso] No se pudieron registrar tokens empresa={}: {}", destino, e.getClass().getName());
        }
    }
}
