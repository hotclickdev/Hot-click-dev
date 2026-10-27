package com.hotclick.service.shoppingassistant;

import org.springframework.dao.DataAccessException;
import com.hotclick.legal.ChatLegalGuard;
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
 * ALTO-1: la cuota ({@link ShoppingAssistantCuota}) se reserva ANTES de crear la sesión y de
 * llamar al LLM. Se registran los tokens vía {@link AiQuotaService#actualizarTokens}.
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
    private final ShoppingAssistantCuota         cuota;
    private final ShoppingAssistantSesionFirma   firma;

    public ShoppingAssistantService(RagPipeline ragPipeline,
                                    AiQuotaService aiQuotaService,
                                    InputSanitizer sanitizer,
                                    CustomerMemoryService customerMemoryService,
                                    QueryClassifier queryClassifier,
                                    AssistantMetricsService metricsService,
                                    ShoppingAssistantSessionHelper sessionHelper,
                                    ShoppingAssistantPersistence persistence,
                                    ShoppingAssistantFeedbackHandler feedbackHandler,
                                    ShoppingAssistantCuota cuota,
                                    ShoppingAssistantSesionFirma firma) {
        this.ragPipeline           = ragPipeline;
        this.aiQuotaService        = aiQuotaService;
        this.sanitizer             = sanitizer;
        this.customerMemoryService = customerMemoryService;
        this.queryClassifier       = queryClassifier;
        this.metricsService        = metricsService;
        this.sessionHelper         = sessionHelper;
        this.persistence           = persistence;
        this.feedbackHandler       = feedbackHandler;
        this.cuota                 = cuota;
        this.firma                 = firma;
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
        var legal = ChatLegalGuard.revisar(mensaje);
        if (legal != ChatLegalGuard.Motivo.OK) {
            return new ChatResponse(
                ChatLegalGuard.respuesta(legal),
                sesionIdStr, List.of(), List.of(), List.of());
        }

        // ALTO-2: clasificación, sesión, historial, memoria y persistencia quedan fuera del
        // circuit breaker de RagPipeline; cualquier fallo ahí responde contingencia con 200.
        try {
            return chatInterno(empresaId, empresaNombre, mensaje, sesionIdStr, contexto,
                visitorId, marketplace, productoId);
        } catch (RuntimeException e) {
            String correlacion = UUID.randomUUID().toString().substring(0, 8);
            if (esErrorDeDatos(e)) {
                // B1: mensajes JDBC pueden traer el texto del visitante; sin mensaje ni stacktrace.
                log.error("[rag] Fallo fuera del circuit breaker ref={} paso=chat empresa={}: {}",
                    correlacion, empresaId, e.getClass().getName());
            } else {
                log.error("[rag] Fallo fuera del circuit breaker ref={} paso=chat empresa={}: {}",
                    correlacion, empresaId, e.getClass().getSimpleName(), e);
            }
            return new ChatResponse(RagResult.fallback().respuesta(),
                sesionIdStr, List.of(), List.of(), List.of());
        }
    }

    private ChatResponse chatInterno(Long empresaId, String empresaNombre, String mensaje,
                                     String sesionIdStr, String contexto, String visitorId,
                                     boolean marketplace, Long productoId) {
        // 2. Clasificar la consulta — bloquear antes de cualquier I/O si no es del dominio
        QueryClassification classification = queryClassifier.classify(mensaje, productoId);
        metricsService.record(classification);
        if (!classification.isAllowed()) {
            String respuesta = classification.isInjection()
                ? "No puedo proporcionar información interna del sistema. " +
                  "Puedo ayudarte únicamente con consultas relacionadas con HOTCLICK."
                : "Solo puedo ayudarte a encontrar productos. ¿Qué estás buscando?";
            return new ChatResponse(respuesta, sesionIdStr, List.of(), List.of(), List.of());
        }

        // ALTO-1: sólo se reutiliza una sesión con token firmado por el servidor PARA ESTA tienda.
        UUID sesionPrevia = firma.verificar(sesionIdStr, empresaId);

        // ALTO-1: tope de costo ANTES de crear sesión y de cualquier llamada al LLM → 200 degradado.
        if (!cuota.reservar(empresaId, marketplace)) {
            return new ChatResponse(ShoppingAssistantCuota.RESPUESTA_AGOTADA,
                sesionPrevia == null ? null : sesionIdStr.trim(), List.of(), List.of(), List.of());
        }

        // 3. Resolver o crear sesión
        UUID sesionId = sessionHelper.resolveSession(
            sesionPrevia == null ? null : sesionPrevia.toString(), empresaId);
        String sesionToken = firma.firmar(empresaId, sesionId);

        // 4. Cargar historial (antes de persistir el mensaje actual)
        List<Map<String, Object>> historial = sessionHelper.loadHistory(sesionId);

        // 5. Cargar memoria del visitante (best-effort, nunca falla el request)
        CustomerMemoryDto memoria = customerMemoryService.getOrCreate(visitorId);

        // 6. Ejecutar el pipeline RAG con memoria del cliente inyectada en el prompt
        String contextoSeguro = ChatContextoPermitido.normalizar(contexto);
        RagResult resultado = ragPipeline.ejecutar(
            mensaje, empresaId, empresaNombre, historial, contextoSeguro, memoria.toXmlBlock(), marketplace, productoId);

        // 7. Persistir pregunta + respuesta (best-effort: no tira la respuesta ya generada)
        try {
            persistence.persistirMensajes(sesionId, empresaId, mensaje, resultado);
        } catch (DataAccessException e) {
            // B2: solo fallos de datos son best-effort; B1: sin mensaje ni stacktrace.
            String correlacion = UUID.randomUUID().toString().substring(0, 8);
            log.error("[rag] No se pudo persistir el turno ref={} paso=persistencia empresa={} sesion={}: {}",
                correlacion, empresaId, sesionId, e.getClass().getName());
        }

        // 8. Registrar tokens para billing/analytics (best-effort)
        try {
            if (resultado.tokensEntrada() > 0 || resultado.tokensSalida() > 0) {
                aiQuotaService.actualizarTokens(
                    empresaId, resultado.tokensEntrada(), resultado.tokensSalida());
            }
        } catch (Exception e) {
            // C2: sin mensaje (puede traer SQL/datos del visitante), solo la clase.
            log.warn("[rag] No se pudo actualizar cuota de tokens empresa={}: {}", empresaId, e.getClass().getName());
        }

        // 9. Actualizar memoria del visitante de forma asíncrona (no bloquea el response)
        try {
            customerMemoryService.updateMemoryAsync(visitorId, mensaje, resultado.respuesta());
        } catch (RuntimeException e) {
            log.warn("[rag] No se pudo programar memoria visitante: {}", e.getClass().getSimpleName());
        }

        return new ChatResponse(
            resultado.respuesta(),
            sesionToken,
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
        submitFeedback(sesionIdStr, msgIndex, rating, null);
    }

    /** @param empresaIdActual empresa del tenant de la request (null si el cliente no envió slug). */
    public void submitFeedback(String sesionIdStr, int msgIndex, int rating, Long empresaIdActual) {
        UUID sesion = verificarParaTienda(sesionIdStr, empresaIdActual);
        if (sesion == null) return;
        feedbackHandler.submitFeedback(sesion.toString(), msgIndex, rating);
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
        return getSessionHistory(sesionIdStr, null);
    }

    public Map<String, Object> getSessionHistory(String sesionIdStr, Long empresaIdActual) {
        UUID sesion = verificarParaTienda(sesionIdStr, empresaIdActual);
        if (sesion == null) return Map.of("sesionId", "", "mensajes", List.of());
        Map<String, Object> h = new java.util.HashMap<>(sessionHelper.getSessionHistory(sesion.toString()));
        if (h.containsKey("sesionId") && !"".equals(h.get("sesionId"))) h.put("sesionId", sesionIdStr.trim());
        return h;
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
        expireSession(sesionIdStr, null);
    }

    public void expireSession(String sesionIdStr, Long empresaIdActual) {
        UUID sesion = verificarParaTienda(sesionIdStr, empresaIdActual);
        if (sesion == null) return;
        sessionHelper.expireSession(sesion.toString());
    }

    /**
     * Verifica el token contra la empresa dueña de la sesión en BD y, si la request trae tenant,
     * exige que sea esa misma empresa. Un token de la tienda A nunca opera sobre la tienda B.
     */
    private UUID verificarParaTienda(String token, Long empresaIdActual) {
        UUID uuid = ShoppingAssistantSesionFirma.uuidDe(token);
        if (uuid == null) return null;
        Long duena;
        try {
            duena = sessionHelper.empresaDeSesion(uuid);
        } catch (DataAccessException e) {
            return null;
        }
        if (duena == null) return null;
        if (empresaIdActual != null && !empresaIdActual.equals(duena)) return null;
        return firma.verificar(token, duena);
    }

    /**
     * true si la excepción o alguna de sus causas es DataAccessException o SQLException cruda (B1).
     * C2: una cadena de más de 16 causas falla cerrado (se trata como sensible).
     */
    static boolean esErrorDeDatos(Throwable t) {
        int i = 0;
        for (; t != null && i < 16; t = t.getCause(), i++) {
            if (t instanceof DataAccessException || t instanceof java.sql.SQLException) return true;
        }
        return t != null;
    }
}
