package com.hotclick.rag.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.rag.classifier.AssistantMetricsService;
import com.hotclick.rag.classifier.QueryClassification;
import com.hotclick.rag.classifier.QueryClassifier;
import com.hotclick.rag.dto.ChatResponse;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.pipeline.RagPipeline;
import com.hotclick.rag.pipeline.RagResult;
import com.hotclick.service.AiQuotaService;
import com.hotclick.utils.InputSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Orquestador de negocio del asistente de compras público.
 *
 * Responsabilidades:
 *   1. Sanitizar y validar la entrada del usuario.
 *   2. Resolver o crear la sesión en {@code hot_click_chat_sesion_tb}.
 *   3. Cargar el historial de conversación (últimos {@value #HISTORY_MESSAGES} mensajes).
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

    /** Número de mensajes históricos (user + assistant) que se envían a Claude como contexto. */
    private static final int HISTORY_MESSAGES = 6;   // 3 turnos = 6 mensajes
    private static final int MAX_MSG_LENGTH   = 500;

    private final RagPipeline            ragPipeline;
    private final JdbcTemplate           jdbc;
    private final AiQuotaService         aiQuotaService;
    private final InputSanitizer         sanitizer;
    private final ObjectMapper           objectMapper;
    private final CustomerMemoryService  customerMemoryService;
    private final QueryClassifier        queryClassifier;
    private final AssistantMetricsService metricsService;

    public ShoppingAssistantService(RagPipeline ragPipeline,
                                    JdbcTemplate jdbc,
                                    AiQuotaService aiQuotaService,
                                    InputSanitizer sanitizer,
                                    ObjectMapper objectMapper,
                                    CustomerMemoryService customerMemoryService,
                                    QueryClassifier queryClassifier,
                                    AssistantMetricsService metricsService) {
        this.ragPipeline           = ragPipeline;
        this.jdbc                  = jdbc;
        this.aiQuotaService        = aiQuotaService;
        this.sanitizer             = sanitizer;
        this.objectMapper          = objectMapper;
        this.customerMemoryService = customerMemoryService;
        this.queryClassifier       = queryClassifier;
        this.metricsService        = metricsService;
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
                             String contexto, String visitorId) {

        // 1. Sanitizar entrada
        String mensaje = sanitizer.cleanWithLimit(
            mensajeRaw == null ? "" : mensajeRaw, MAX_MSG_LENGTH);
        if (mensaje.isBlank()) {
            return new ChatResponse(
                "No recibí ningún mensaje. ¿En qué te puedo ayudar?",
                sesionIdStr, List.of(), List.of());
        }

        // 2. Clasificar la consulta — bloquear antes de cualquier I/O si no es del dominio
        QueryClassification classification = queryClassifier.classify(mensaje);
        metricsService.record(classification);
        if (!classification.isAllowed()) {
            String respuesta = classification.isInjection()
                ? "No puedo proporcionar información interna del sistema. " +
                  "Puedo ayudarte únicamente con consultas relacionadas con HOTCLICK."
                : "Soy el asistente de HOTCLICK y únicamente puedo ayudarte con " +
                  "productos, compras, pagos, entregas y consultas relacionadas con nuestra tienda. " +
                  "¿En qué te puedo ayudar?";
            return new ChatResponse(respuesta, sesionIdStr, List.of(), List.of());
        }

        // 3. Resolver o crear sesión
        UUID sesionId = resolveSession(sesionIdStr, empresaId);

        // 4. Cargar historial (antes de persistir el mensaje actual)
        List<Map<String, Object>> historial = loadHistory(sesionId);

        // 5. Cargar memoria del visitante (best-effort, nunca falla el request)
        CustomerMemoryService.CustomerMemoryDto memoria =
            customerMemoryService.getOrCreate(visitorId);

        // 6. Ejecutar el pipeline RAG con memoria del cliente inyectada en el prompt
        RagResult resultado = ragPipeline.ejecutar(
            mensaje, empresaId, empresaNombre, historial, contexto, memoria.toXmlBlock());

        // 7. Persistir pregunta + respuesta de forma atómica; actualizar sesión
        persistirMensajes(sesionId, empresaId, mensaje, resultado);

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
            resultado.categorias()
        );
    }

    // ── Gestión de sesión ─────────────────────────────────────────────────────

    /**
     * Valida la sesión proporcionada por el cliente o crea una nueva.
     * Si el sesionIdStr es un UUID válido que pertenece a la empresa correcta, se reutiliza.
     * En cualquier otro caso (UUID inválido, sesión expirada, empresa distinta)
     * se crea una sesión nueva para prevenir session fixation.
     */
    private UUID resolveSession(String sesionIdStr, Long empresaId) {
        if (sesionIdStr != null && !sesionIdStr.isBlank()) {
            try {
                UUID candidato = UUID.fromString(sesionIdStr.trim());
                Integer count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM hot_click_chat_sesion_tb " +
                    "WHERE id_sesion = ?::uuid AND fk_id_empresa = ?",
                    Integer.class, candidato.toString(), empresaId);
                if (count != null && count > 0) {
                    return candidato; // sesión válida y pertenece a esta empresa
                }
            } catch (IllegalArgumentException ignored) {
                // UUID mal formado — crear nueva sesión
            }
        }

        UUID nuevo = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO hot_click_chat_sesion_tb
              (id_sesion, fk_id_empresa, canal, iniciada_en, ultimo_mensaje_en, metadatos)
            VALUES (?::uuid, ?, 'WEB', NOW(), NOW(), '{}')
            """, nuevo.toString(), empresaId);
        log.debug("[rag] Sesión creada id={} empresa={}", nuevo, empresaId);
        return nuevo;
    }

    // ── Historial ─────────────────────────────────────────────────────────────

    /**
     * Carga los últimos {@value #HISTORY_MESSAGES} mensajes de la sesión en orden
     * cronológico ascendente, en el formato que espera la API de Anthropic Claude
     * ({@code role}/{@code content}).
     */
    private List<Map<String, Object>> loadHistory(UUID sesionId) {
        // ORDER BY DESC + reversa en Java: trae los N más recientes en orden cronológico.
        List<Map<String, Object>> rows = jdbc.queryForList(
            """
            SELECT rol, contenido
            FROM   hot_click_chat_mensaje_shopping_tb
            WHERE  fk_id_sesion = ?::uuid
              AND  rol IN ('user', 'assistant')
            ORDER  BY fecha_creacion DESC
            LIMIT  ?
            """,
            sesionId.toString(), HISTORY_MESSAGES
        );

        Collections.reverse(rows); // cronológico: más antiguo primero

        return rows.stream()
            .filter(r -> r.get("contenido") != null)
            .map(r -> Map.<String, Object>of(
                "role",    r.get("rol").toString(),
                "content", r.get("contenido").toString()
            ))
            .collect(Collectors.toList());
    }

    // ── Persistencia ──────────────────────────────────────────────────────────

    /**
     * Guarda de forma atómica el mensaje del usuario, la respuesta del asistente
     * (con los productos referenciados en JSONB) y actualiza el timestamp de la sesión.
     */
    @Transactional
    protected void persistirMensajes(UUID sesionId, Long empresaId,
                                     String userMessage, RagResult resultado) {
        String productosJson = toJson(resultado.productosReferenciados());

        // Mensaje del usuario (sin referencias de productos)
        jdbc.update("""
            INSERT INTO hot_click_chat_mensaje_shopping_tb
              (fk_id_sesion, fk_id_empresa, rol, contenido,
               tokens_entrada, tokens_salida, productos_refs, fecha_creacion)
            VALUES (?::uuid, ?, 'user', ?, 0, 0, '[]'::jsonb, NOW())
            """,
            sesionId.toString(), empresaId, userMessage);

        // Respuesta del asistente (con los productos que el RAG recuperó como contexto)
        jdbc.update("""
            INSERT INTO hot_click_chat_mensaje_shopping_tb
              (fk_id_sesion, fk_id_empresa, rol, contenido,
               tokens_entrada, tokens_salida, productos_refs, fecha_creacion)
            VALUES (?::uuid, ?, 'assistant', ?, ?, ?, ?::jsonb, NOW())
            """,
            sesionId.toString(), empresaId, resultado.respuesta(),
            resultado.tokensEntrada(), resultado.tokensSalida(), productosJson);

        // Mantener ultimo_mensaje_en actualizado para retención de datos
        jdbc.update(
            "UPDATE hot_click_chat_sesion_tb SET ultimo_mensaje_en = NOW() WHERE id_sesion = ?::uuid",
            sesionId.toString());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String toJson(List<ProductoContexto> productos) {
        try {
            return objectMapper.writeValueAsString(productos);
        } catch (Exception e) {
            return "[]";
        }
    }
}
