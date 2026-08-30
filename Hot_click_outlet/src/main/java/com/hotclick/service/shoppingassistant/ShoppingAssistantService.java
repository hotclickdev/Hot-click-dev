package com.hotclick.service.shoppingassistant;

import com.hotclick.rag.classifier.AssistantMetricsService;
import com.hotclick.rag.classifier.QueryClassification;
import com.hotclick.rag.classifier.QueryClassifier;
import com.hotclick.rag.dto.ChatResponse;
import com.hotclick.rag.pipeline.RagPipeline;
import com.hotclick.rag.pipeline.RagResult;
import com.hotclick.service.AiQuotaService;
import com.hotclick.service.customermemory.CustomerMemoryDto;
import com.hotclick.service.customermemory.CustomerMemoryService;
import com.hotclick.utils.ChatContextoPermitido;
import com.hotclick.utils.InputSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Orquestador de negocio del asistente de compras público.
 *
 * Responsabilidades:
 *   1. Sanitizar y validar la entrada del usuario.
 *   2. Resolver o crear la sesión en {@code hot_click_chat_sesion_tb}.
 *   3. Cargar el historial de conversación (últimos {@value ShoppingAssistantSessionHelper#HISTORY_MESSAGES} mensajes).
 *   4. Delegar al {@link RagPipeline} para obtener la respuesta de Claude.
 *   5. Persistir de forma atómica la pregunta del usuario y la respuesta de la IA.
 *   6. Actualizar el token usage en {@link AiQuotaService}.
 *
 * La sesión y los mensajes se manejan con JdbcTemplate para evitar mapear
 * el tipo JSONB y UUID de las tablas RAG con JPA/Hibernate.
 *
 * No se verifica cuota antes de llamar a Claude (endpoint público, la degradación
 * graceful del Circuit Breaker es suficiente protección). Sí se registran los tokens
 * consumidos vía {@link AiQuotaService#actualizarTokens} para billing y analytics.
 */
@Service
public class ShoppingAssistantService {

    private static final Logger log = LoggerFactory.getLogger(ShoppingAssistantService.class);

    private static final int MAX_MSG_LENGTH = 500;

    private final RagPipeline                    ragPipeline;
    private final AiQuotaService                 aiQuotaService;
    private final InputSanitizer                 sanitizer;
    private final CustomerMemoryService          customerMemoryService;
    private final QueryClassifier                queryClassifier;
    private final AssistantMetricsService        metricsService;
    private final ShoppingAssistantSessionHelper sessionHelper;
    private final ShoppingAssistantPersistence   persistence;
    private final ShoppingAssistantFeedbackHandler feedbackHandler;

    public ShoppingAssistantService(RagPipeline ragPipeline,
                                    AiQuotaService aiQuotaService,
                                    InputSanitizer sanitizer,
                                    CustomerMemoryService customerMemoryService,
                                    QueryClassifier queryClassifier,
                                    AssistantMetricsService metricsService,
                                    ShoppingAssistantSessionHelper sessionHelper,
                                    ShoppingAssistantPersistence persistence,
                                    ShoppingAssistantFeedbackHandler feedbackHandler) {
        this.ragPipeline           = ragPipeline;
        this.aiQuotaService        = aiQuotaService;
        this.sanitizer             = sanitizer;
        this.customerMemoryService = customerMemoryService;
        this.queryClassifier       = queryClassifier;
        this.metricsService        = metricsService;
        this.sessionHelper         = sessionHelper;
        this.persistence           = persistence;
        this.feedbackHandler       = feedbackHandler;
    }

    // ── Punto de entrada público ──────────────────────────────────────────────

    /**
     * Procesa un turno de conversación del asistente de compras.
     *
     * @param empresaId     ID de la empresa (ya validada y activa por el controller).
     * @param empresaNombre Nombre comercial para personalizar el prompt.
     * @param mensajeRaw    Texto del usuario sin sanitizar.
     * @param sesionIdStr   UUID de sesión existente; null/blank para sesión nueva.
     * @return {@link ChatResponse} con respuesta, sesionId y productos referenciados.
     */
    public ChatResponse chat(Long empresaId, String empresaNombre,
                             String mensajeRaw, String sesionIdStr,
                             String contexto, String visitorId, boolean marketplace, Long productoId) {

        // 1. Sanitizar entrada
        String mensaje = sanitizer.cleanWithLimit(
            mensajeRaw == null ? "" : mensajeRaw, MAX_MSG_LENGTH);
        if (mensaje.isBlank()) {
            return new ChatResponse(
                "No recibí ningún mensaje. ¿En qué te puedo ayudar?",
                sesionIdStr, List.of(), List.of(), List.of());
        }

        // 2. Clasificar la consulta — bloquear antes de cualquier I/O si no es del dominio
        QueryClassification classification = queryClassifier.classify(mensaje);
        metricsService.record(classification);
        if (!classification.isAllowed()) {
            String respuesta = classification.isInjection()
                ? "No puedo proporcionar información interna del sistema. " +
                  "Puedo ayudarte únicamente con consultas relacionadas con HOTCLICK."
                : "Solo puedo ayudarte a encontrar productos. ¿Qué estás buscando?";
            return new ChatResponse(respuesta, sesionIdStr, List.of(), List.of(), List.of());
        }

        // 3. Resolver o crear sesión
        UUID sesionId = sessionHelper.resolveSession(sesionIdStr, empresaId);

        // 4. Cargar historial (antes de persistir el mensaje actual)
        List<Map<String, Object>> historial = sessionHelper.loadHistory(sesionId);

        // 5. Cargar memoria del visitante (best-effort, nunca falla el request)
        CustomerMemoryDto memoria = customerMemoryService.getOrCreate(visitorId);

        // 6. Ejecutar el pipeline RAG con memoria del cliente inyectada en el prompt
        String contextoSeguro = ChatContextoPermitido.normalizar(contexto);
        RagResult resultado = ragPipeline.ejecutar(
            mensaje, empresaId, empresaNombre, historial, contextoSeguro, memoria.toXmlBlock(), marketplace, productoId);

        // 7. Persistir pregunta + respuesta de forma atómica; actualizar sesión
        persistence.persistirMensajes(sesionId, empresaId, mensaje, resultado);

        // 8. Registrar tokens para billing/analytics (best-effort)
        try {
            if (resultado.tokensEntrada() > 0 || resultado.tokensSalida() > 0) {
                aiQuotaService.actualizarTokens(
                    empresaId, resultado.tokensEntrada(), resultado.tokensSalida());
            }
        } catch (Exception e) {
            log.warn("[rag] No se pudo actualizar cuota de tokens empresa={}: {}", empresaId, e.getMessage());
        }

        // 9. Actualizar memoria del visitante de forma asíncrona (no bloquea el response)
        customerMemoryService.updateMemoryAsync(visitorId, mensaje, resultado.respuesta());

        return new ChatResponse(
            resultado.respuesta(),
            sesionId.toString(),
            resultado.productosReferenciados(),
            resultado.categorias(),
            resultado.opts()
        );
    }

    // ── Feedback de mensajes ──────────────────────────────────────────────────

    /**
     * Guarda el feedback (👍/👎) del usuario sobre un mensaje del asistente.
     * Identifica el mensaje por posición ordinal (0-based) dentro de la sesión.
     * Operación best-effort: los errores se loguean pero nunca se propagan.
     *
     * @param sesionIdStr UUID de la sesión como string.
     * @param msgIndex    Índice 0-based del mensaje assistant dentro de la sesión.
     * @param rating      1 = positivo, -1 = negativo.
     */
    public void submitFeedback(String sesionIdStr, int msgIndex, int rating) {
        feedbackHandler.submitFeedback(sesionIdStr, msgIndex, rating);
    }

    // ── Historial público ─────────────────────────────────────────────────────

    /**
     * Retorna los últimos 30 mensajes de una sesión en formato frontend
     * ({@code rol}/{@code texto}), para re-sincronizar el historial en page reload
     * y permitir que CartAssistant lea el contexto de la sesión GENERAL.
     *
     * <p>Seguridad: el {@code sesionId} (UUID v4, 122 bits de entropía) funciona
     * como token opaco. Si el UUID no existe en BD se retorna lista vacía.
     */
    public Map<String, Object> getSessionHistory(String sesionIdStr) {
        return sessionHelper.getSessionHistory(sesionIdStr);
    }

    // ── Expiración manual de sesión ───────────────────────────────────────────

    /**
     * Expira una sesión eliminando sus mensajes y adelantando el timestamp de
     * retención para que {@code DataRetentionScheduler} la limpie en el próximo ciclo.
     *
     * <p>Llamado por el frontend cuando el temporizador de 10 min de inactividad dispara.
     * Operación idempotente: si la sesión no existe o el UUID es inválido, retorna sin error.
     */
    public void expireSession(String sesionIdStr) {
        sessionHelper.expireSession(sesionIdStr);
    }
}
