package com.hotclick.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.model.AiMensaje;
import com.hotclick.model.Empresa;
import com.hotclick.repository.AiMensajeRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.net.ConnectException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletionException;

/**
 * AI Copilot powered by NVIDIA NIM (OpenAI-compatible chat completions API).
 *
 * Uses Java 21 HttpClient — no external SDK required.
 * Streams the response via SSE to avoid connection timeouts.
 * When api-key is blank, returns a mock response (dev mode).
 *
 * Context injected into every system prompt:
 *   - Empresa name, plan, country
 *   - Last 7 days KPIs (orders, revenue, top products)
 *   - Low-stock alerts
 */
@Service
public class AiCopilotService {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotService.class);
    private static final int    HISTORY_TURNS      = 8;      // last N messages sent as context — bounds input tokens
    private static final int    MAX_RESPONSE_CHARS = 8_000;  // hard cap — stops runaway stream output loops
    private static final String NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    @Value("${nvidia.api-key:}")
    private String apiKey;

    @Value("${nvidia.model:meta/llama-3.3-70b-instruct}")
    private String model;

    @Autowired private AiMensajeRepository     aiMensajeRepository;
    @Autowired private AiQuotaService          aiQuotaService;
    @Autowired private EmpresaRepository       empresaRepository;
    @Autowired private ObjectMapper            objectMapper;
    @Autowired private JdbcTemplate            jdbc;
    @Autowired private InventoryForecastService inventoryForecastService;

    // ── Public API ────────────────────────────────────────────────────────────

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    /** Returns the last HISTORY_TURNS messages for the empresa. */
    public List<Map<String, Object>> getHistorial(Long empresaId) {
        return aiMensajeRepository.findByEmpresaIdOrderByFechaCreacionAsc(
            empresaId, PageRequest.of(0, 50))
            .stream().map(m -> Map.<String, Object>of(
                "id",       m.getId(),
                "rol",      m.getRol(),
                "contenido", m.getContenido(),
                "fecha",    m.getFechaCreacion() != null ? m.getFechaCreacion().toString() : ""
            )).collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void limpiarHistorial(Long empresaId) {
        aiMensajeRepository.deleteByEmpresaId(empresaId);
    }

    private static final int DESCUENTO_SUGERIDO_PCT = 15;

    /**
     * Productos sin ventas en 60+ días, con la acción que el Copilot puede sugerir
     * (aplicar descuento). Es solo lectura — la ejecución real pasa por el endpoint
     * existente PATCH /api/productos/{id}/oferta, que el dueño o ADMIN debe confirmar
     * explícitamente desde la UI. El Copilot nunca aplica cambios por sí mismo.
     */
    public List<Map<String, Object>> getProductosSinVentaAccionables(Long empresaId) {
        return inventoryForecastService.productosLentosMovimiento(empresaId).stream()
            .limit(8)
            .map(p -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",             p.get("id_producto"));
                m.put("nombre",         p.get("nombre_producto"));
                m.put("stock",          p.get("stock_actual"));
                m.put("diasSinVenta",   diasDesde(p.get("fecha_ultima_venta")));
                m.put("descuentoSugeridoPct", DESCUENTO_SUGERIDO_PCT);
                return m;
            })
            .collect(java.util.stream.Collectors.toList());
    }

    private static final List<String> SUGERENCIAS_EVERGREEN = List.of(
        "¿Cómo van mis ventas esta semana?",
        "¿Cuáles son mis productos más vendidos?",
        "¿Qué cliente me compra más un producto específico?",
        "Dame un resumen de mi negocio"
    );

    /**
     * Preguntas sugeridas para el chat: primero las que reflejan un hallazgo real
     * del negocio (stock crítico, productos sin venta, pedidos pendientes), después
     * se completa con preguntas genéricas hasta un máximo de 4.
     * Nunca lanza — si los datos no están disponibles, cae a las genéricas.
     */
    public List<String> getSugerencias(Long empresaId) {
        List<String> chips = new ArrayList<>();
        try {
            int lentos = inventoryForecastService.productosLentosMovimiento(empresaId).size();
            if (lentos > 0) {
                chips.add(String.format("Tengo %d producto%s sin ventas en 60+ días, ¿cuáles son y qué hago?",
                    lentos, lentos == 1 ? "" : "s"));
            }

            int enRiesgo = inventoryForecastService.productosEnRiesgo(empresaId).size();
            if (enRiesgo > 0) {
                chips.add(String.format("Tengo %d producto%s con stock crítico, ¿cuáles son?",
                    enRiesgo, enRiesgo == 1 ? "" : "s"));
            }

            int pendientes = countPedidosPendientes(empresaId);
            if (pendientes > 0) {
                chips.add(String.format("Tengo %d pedido%s pendiente%s de despachar, ¿cuáles priorizo?",
                    pendientes, pendientes == 1 ? "" : "s", pendientes == 1 ? "" : "s"));
            }
        } catch (DataAccessException e) {
            log.warn("[AI-Copilot] empresaId={} sugerencias dinámicas no disponibles: {}", empresaId, e.getMessage());
        }

        for (String s : SUGERENCIAS_EVERGREEN) {
            if (chips.size() >= 4) break;
            chips.add(s);
        }
        return chips;
    }

    private int countPedidosPendientes(Long empresaId) {
        String sql = """
            SELECT COUNT(*) FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND estado_pedido IN ('PAGADO','PROCESANDO','PREPARANDO')
            """;
        Integer count = jdbc.queryForObject(sql, Integer.class, empresaId);
        return count != null ? count : 0;
    }

    /**
     * Main streaming endpoint.
     * Saves the user message, streams NVIDIA's reply via SSE,
     * then saves the assistant message and updates quota.
     */
    @CircuitBreaker(name = "nvidia", fallbackMethod = "chatStreamFallback")
    public void chatStream(Long empresaId, String userMessage, SseEmitter emitter) {
        // TenantContext sobrevive el salto a sseExecutor (TenantAwareTaskDecorator),
        // pero NO sobrevive al callback de HttpClient.sendAsync más abajo — ese corre
        // en un hilo propio del HttpClient. Por eso se captura aquí y se pasa explícito.
        Long tenantId = TenantContext.get();

        // Reserva slot atómicamente antes del HTTP call — elimina race condition TOCTOU
        if (!aiQuotaService.verificarYReservar(empresaId)) {
            sendError(emitter, "Cuota mensual de AI agotada. Actualiza tu plan.");
            return;
        }

        // Save user message
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        saveMsg(empresa, "user", userMessage, 0);

        if (!isEnabled()) {
            // Mock mode for development
            streamMock(emitter, "*(modo desarrollo — configura NVIDIA_API_KEY para respuestas reales)*\n\nHola, soy tu copilot de HOTCLICK. ¿En qué te puedo ayudar con tu negocio?");
            saveMsg(empresa, "assistant", "Mock response", 0);
            return;
        }

        try {
            Intent intent = detectIntent(userMessage);

            // Build messages array para NVIDIA (formato OpenAI chat completions)
            List<Map<String, Object>> messages = buildMessages(empresaId, userMessage);
            String systemPrompt = buildSystemPrompt(empresaId, intent);
            String requestBody  = buildRequestBody(systemPrompt, messages, tenantId);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(NVIDIA_URL))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .header("Accept", "text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                .build();

            HTTP.sendAsync(request, HttpResponse.BodyHandlers.ofLines())
                .thenAccept(response -> processStream(response, emitter, empresa, empresaId))
                .exceptionally(ex -> {
                    reportNvidiaFailure(unwrap(ex), tenantId, emitter);
                    return null;
                });
        } catch (IntegracionExternaException e) {
            reportNvidiaFailure(e, tenantId, emitter);
        }
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
        if (!aiQuotaService.verificarYReservar(empresaId)) {
            return "Se agotó la cuota mensual de consultas con IA de tu plan. Podés seguir usando los botones del menú (/menu), que no consumen cuota.";
        }

        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        saveMsg(empresa, "user", userMessage, 0);

        if (!isEnabled()) {
            String mock = "(modo desarrollo — configurá NVIDIA_API_KEY para respuestas reales)\n\nHola, soy tu copilot de HotClick. ¿En qué te ayudo con tu negocio?";
            saveMsg(empresa, "assistant", mock, 0);
            return mock;
        }

        try {
            Intent intent = detectIntent(userMessage);
            List<Map<String, Object>> messages = buildMessages(empresaId, userMessage);
            String systemPrompt = buildSystemPrompt(empresaId, intent);
            String requestBody  = buildRequestBody(systemPrompt, messages, empresaId, false);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(NVIDIA_URL))
                // 25s y no 60s: en un chat nadie espera más, y el caller necesita
                // enterarse rápido del fallo para activar su fallback.
                .timeout(Duration.ofSeconds(25))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("[AI-sync] empresaId={} NVIDIA respondió {} — {}", empresaId, response.statusCode(), response.body());
                return null;
            }

            JsonNode node = objectMapper.readTree(response.body());
            String texto = node.path("choices").path(0).path("message").path("content").asText("");
            if (texto.isBlank()) {
                return "No pude generar una respuesta. Probá reformular la pregunta.";
            }
            if (texto.length() > MAX_RESPONSE_CHARS) texto = texto.substring(0, MAX_RESPONSE_CHARS);

            int tokensIn  = node.path("usage").path("prompt_tokens").asInt(0);
            int tokensOut = node.path("usage").path("completion_tokens").asInt(0);
            saveMsg(empresa, "assistant", texto, tokensOut);
            aiQuotaService.actualizarTokens(empresaId, tokensIn, tokensOut);
            return texto;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.error("[AI-sync] empresaId={} fallo llamando a NVIDIA — {}", empresaId, e.getMessage());
            return null;
        }
    }

    private static Throwable unwrap(Throwable ex) {
        return ex instanceof CompletionException && ex.getCause() != null ? ex.getCause() : ex;
    }

    /**
     * Punto único de clasificación + logging para fallos de Claude API.
     *
     * Importante: esto NO llega a GlobalExceptionHandler. El SseEmitter ya fue
     * devuelto al controller antes de que chatStream termine, y el callback de
     * sendAsync().exceptionally() puede correr en un hilo distinto al de la
     * request. La observabilidad real para este flujo es el logging estructurado
     * (lo que Grafana/Datadog scrapean) + un evento "error" explícito por SSE —
     * no el manejador @ExceptionHandler, que aquí es inalcanzable.
     */
    private void reportNvidiaFailure(Throwable cause, Long tenantId, SseEmitter emitter) {
        IntegracionExternaException integrationEx;
        if (cause instanceof IntegracionExternaException iee) {
            integrationEx = iee;
        } else {
            IntegracionExternaException.Tipo tipo;
            if (cause instanceof HttpTimeoutException) {
                tipo = IntegracionExternaException.Tipo.TIMEOUT;
            } else if (cause instanceof ConnectException || cause instanceof IOException) {
                tipo = IntegracionExternaException.Tipo.IO_ERROR;
            } else {
                tipo = IntegracionExternaException.Tipo.DESCONOCIDO;
            }
            integrationEx = new IntegracionExternaException(
                "nvidia-api", tipo, tenantId, "Fallo llamando a NVIDIA API", cause);
        }

        log.error("[AI] tenantId={} integracion={} tipo={} msg={}",
            tenantId, integrationEx.getIntegracion(), integrationEx.getTipo(), integrationEx.getMessage(), integrationEx);

        // Mensaje genérico al cliente — nunca se expone el detalle interno de la excepción.
        sendError(emitter, "El asistente AI no está disponible temporalmente. Intenta de nuevo en unos minutos.");
    }

    private void chatStreamFallback(Long empresaId, String userMessage, SseEmitter emitter, Throwable t) {
        Long tenantId = TenantContext.get();
        IntegracionExternaException integrationEx = new IntegracionExternaException(
            "nvidia-api", IntegracionExternaException.Tipo.RATE_LIMIT, tenantId,
            "Circuit breaker abierto para NVIDIA API", t);
        log.error("[nvidia-circuit] OPEN tenantId={} msg={}", tenantId, integrationEx.getMessage(), integrationEx);
        sendError(emitter, "El asistente AI no está disponible temporalmente. Intente en unos minutos.");
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void processStream(HttpResponse<java.util.stream.Stream<String>> response,
                               SseEmitter emitter, Empresa empresa, Long empresaId) {
        StringBuilder fullText = new StringBuilder();
        int[] tokenCount = {0, 0}; // [input, output]

        try {
            response.body().forEach(line -> {
                if (line.startsWith("data: ")) {
                    String json = line.substring(6).trim();
                    if ("[DONE]".equals(json)) return;
                    try {
                        JsonNode node = objectMapper.readTree(json);

                        // El chunk final (stream_options.include_usage=true) trae "usage" con
                        // choices vacío o ausente — se lee independiente del texto de este chunk.
                        JsonNode usage = node.path("usage");
                        if (usage.isObject()) {
                            tokenCount[0] = usage.path("prompt_tokens").asInt(tokenCount[0]);
                            tokenCount[1] = usage.path("completion_tokens").asInt(tokenCount[1]);
                        }

                        String text = node.path("choices").path(0).path("delta").path("content").asText("");
                        if (!text.isEmpty()) {
                            // Hard cap: kill stream if response grows unreasonably large (loop guard)
                            if (fullText.length() >= MAX_RESPONSE_CHARS) return;
                            fullText.append(text);
                            try {
                                emitter.send(SseEmitter.event().name("delta")
                                    .data(objectMapper.writeValueAsString(Map.of("text", text))));
                            } catch (IOException e) {
                                // Cliente cerró la pestaña/conexión a mitad del stream — esperado, no es
                                // un fallo de la integración con NVIDIA. No se loguea como error.
                                log.debug("[AI] empresaId={} cliente desconectado durante stream: {}", empresaId, e.getMessage());
                            }
                        }
                    } catch (JsonProcessingException e) {
                        // Un chunk SSE individual de NVIDIA vino malformado — se descarta ese chunk
                        // y se sigue con el stream, pero queda visible si el payload de NVIDIA cambió.
                        log.warn("[AI] empresaId={} chunk SSE de NVIDIA no se pudo parsear: {}", empresaId, e.getMessage());
                    }
                }
            });

            emitter.send(SseEmitter.event().name("done").data("{}"));
            emitter.complete();

            // Save assistant reply + actualiza solo tokens (llamadas ya fue incrementado antes del call)
            saveMsg(empresa, "assistant", fullText.toString(), tokenCount[1]);
            aiQuotaService.actualizarTokens(empresaId, tokenCount[0], tokenCount[1]);

        } catch (IOException e) {
            log.error("[AI] empresaId={} error de E/S procesando stream de NVIDIA: {}", empresaId, e.getMessage(), e);
            sendError(emitter, "Error procesando respuesta del AI");
        }
    }

    private void streamMock(SseEmitter emitter, String text) {
        try {
            String[] words = text.split(" ");
            for (String w : words) {
                emitter.send(SseEmitter.event().name("delta")
                    .data(objectMapper.writeValueAsString(Map.of("text", w + " "))));
                Thread.sleep(20);
            }
            emitter.send(SseEmitter.event().name("done").data("{}"));
            emitter.complete();
        } catch (IOException e) {
            log.debug("[AI] cliente desconectado durante mock stream: {}", e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void sendError(SseEmitter emitter, String msg) {
        try {
            emitter.send(SseEmitter.event().name("error")
                .data(objectMapper.writeValueAsString(Map.of("error", msg))));
            emitter.complete();
        } catch (IOException e) {
            // Último intento de avisar al cliente también falló — ya no hay nada más
            // que hacer (cliente desconectado), pero queda visible a nivel debug.
            log.debug("[AI] no se pudo enviar evento de error por SSE: {}", e.getMessage());
        }
    }

    // ── Clasificador de intención ─────────────────────────────────────────────

    private enum Intent { VENTAS, INVENTARIO, CONTENIDO, OPERATIVO, GENERAL }

    private Intent detectIntent(String msg) {
        String lower = msg.toLowerCase();
        if (lower.matches(".*\\b(vend|ingres|factur|cobr|gananci|cuanto.*vendí|revenue|venta|compr.*client|client.*compr|mejor.*client).*")) return Intent.VENTAS;
        if (lower.matches(".*\\b(stock|inventari|bajo.*stock|precio|rebaj|oferta|actualiz.*product|catalog|producto).*")) return Intent.INVENTARIO;
        if (lower.matches(".*\\b(descri|instagram|whatsapp|post|redact|escrib|contenido|caption|anuncio|publicaci|seo|titul).*")) return Intent.CONTENIDO;
        if (lower.matches(".*\\b(pendiente|entreg|envi|pedido|orden|cliente.*espera|despachar|guia).*")) return Intent.OPERATIVO;
        return Intent.GENERAL;
    }

    // ── System prompt dinámico por intención ──────────────────────────────────

    private String buildSystemPrompt(Long empresaId, Intent intent) {
        String kpis   = getKpiContext(empresaId);
        String extra  = getDynamicData(empresaId, intent);

        String rolDescription = switch (intent) {
            case VENTAS     -> "Analizás ventas, ingresos y comportamiento de clientes. Identificás tendencias y oportunidades.";
            case INVENTARIO -> "Gestionás inventario y catálogo. Identificás productos con stock crítico y oportunidades de precio.";
            case CONTENIDO  -> "Generás contenido de venta persuasivo, optimizado para Costa Rica. Dominás el tono casual y efectivo del mercado local.";
            case OPERATIVO  -> "Revisás pedidos y operaciones. Priorizás por urgencia y ayudás a resolver cuellos de botella.";
            case GENERAL    -> "Asesorás sobre cualquier aspecto del negocio con base en los datos reales disponibles.";
        };

        return """
            Sos el Copilot de HOTCLICK, asistente de negocio para emprendedores costarricenses.
            Respondés en español con el vos costarricense. Sos directo, concreto y accionable.
            %s

            KPIs GENERALES DEL NEGOCIO:
            %s

            DATOS ESPECÍFICOS PARA ESTA CONSULTA:
            %s

            REGLAS:
            - Usá los datos inyectados arriba; nunca inventés cifras
            - Cuando generes contenido (posts, descripciones), sé persuasivo y natural, no corporativo
            - Si los datos muestran un problema, señalalo y proponé una acción concreta
            - Respondés solo sobre este negocio; si la pregunta es ajena, redirigís amablemente
            - Máximo 400 palabras por respuesta salvo que se pida contenido largo
            """.formatted(rolDescription, kpis, extra);
    }

    private String getDynamicData(Long empresaId, Intent intent) {
        try {
            return switch (intent) {
                case VENTAS     -> getVentasData(empresaId);
                case INVENTARIO -> getInventarioData(empresaId);
                case CONTENIDO  -> getCatalogoData(empresaId);
                case OPERATIVO  -> getPedidosPendientesData(empresaId);
                case GENERAL    -> "";
            };
        } catch (DataAccessException e) {
            log.warn("[AI-Copilot] empresaId={} intent={} datos no disponibles: {}", empresaId, intent, e.getMessage());
            return "- Datos específicos no disponibles en este momento";
        }
    }

    private String getVentasData(Long empresaId) {
        String sqlHoy = """
            SELECT COUNT(*) as pedidos, COALESCE(SUM(total_pedido),0) as ingresos
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND DATE(fecha_pedido) = CURRENT_DATE
              AND estado_pedido IN ('PAGADO','ENTREGADO')
            """;
        String sql30d = """
            SELECT COUNT(*) as pedidos, COALESCE(SUM(total_pedido),0) as ingresos
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND fecha_pedido >= NOW() - INTERVAL '30 days'
              AND estado_pedido IN ('PAGADO','ENTREGADO')
            """;
        String sqlTopProds = """
            SELECT p.nombre_producto, COUNT(dp.id_detalle) as veces, SUM(dp.subtotal) as total
            FROM hot_click_detalle_pedido_tb dp
            JOIN hot_click_pedido_tb ped ON dp.fk_id_pedido = ped.id_pedido
            JOIN hot_click_producto_tb p ON dp.fk_id_producto = p.id_producto
            WHERE ped.fk_id_empresa = ? AND ped.fecha_pedido >= NOW() - INTERVAL '30 days'
              AND ped.estado_pedido IN ('PAGADO','ENTREGADO')
            GROUP BY p.nombre_producto ORDER BY veces DESC LIMIT 5
            """;
        var hoy  = jdbc.queryForMap(sqlHoy,  empresaId);
        var m30  = jdbc.queryForMap(sql30d, empresaId);
        var top  = jdbc.queryForList(sqlTopProds, empresaId);
        java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Hoy: %s pedidos / ₡%s ingresos%n",
            hoy.get("pedidos"), fmt.format(hoy.get("ingresos"))));
        sb.append(String.format("Últimos 30 días: %s pedidos / ₡%s ingresos%n",
            m30.get("pedidos"), fmt.format(m30.get("ingresos"))));
        if (!top.isEmpty()) {
            sb.append("Top productos más vendidos (30d):\n");
            top.forEach(p -> sb.append(String.format("  - %s: %s ventas / ₡%s%n",
                p.get("nombre_producto"), p.get("veces"), fmt.format(p.get("total")))));
        }
        sb.append(getProductosSinVentaData(empresaId));
        sb.append(getClientesPorProductoData(empresaId));
        return sb.toString();
    }

    /** Productos activos sin ventas en 60+ días — reutiliza el cálculo de InventoryForecastService (F21). */
    private String getProductosSinVentaData(Long empresaId) {
        var lentos = inventoryForecastService.productosLentosMovimiento(empresaId);
        if (lentos.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("\nProductos sin ventas recientes (60+ días):\n");
        lentos.stream().limit(8).forEach(p -> sb.append(String.format("  - %s: stock %s, última venta hace %s%n",
            p.get("nombre_producto"), p.get("stock_actual"), diasDesde(p.get("fecha_ultima_venta")))));
        return sb.toString();
    }

    private String diasDesde(Object fecha) {
        LocalDateTime momento;
        if (fecha instanceof java.sql.Timestamp ts)   momento = ts.toLocalDateTime();
        else if (fecha instanceof LocalDateTime ldt)   momento = ldt;
        else return "nunca registrada";
        return ChronoUnit.DAYS.between(momento, LocalDateTime.now(Constants.ZONA_CR)) + " días";
    }

    /** Top 3 clientes por cada uno de los productos más vendidos (90d) — responde "quién me compra tal producto". */
    private String getClientesPorProductoData(Long empresaId) {
        String sql = """
            WITH ventas AS (
                SELECT p.nombre_producto, u.nombre_usuario,
                       COUNT(*) AS veces,
                       ROW_NUMBER() OVER (PARTITION BY p.nombre_producto ORDER BY COUNT(*) DESC) AS rn
                FROM hot_click_detalle_pedido_tb dp
                JOIN hot_click_pedido_tb ped ON dp.fk_id_pedido = ped.id_pedido
                JOIN hot_click_producto_tb p ON dp.fk_id_producto = p.id_producto
                LEFT JOIN hot_click_usuario_tb u ON ped.fk_id_usuario = u.id_usuario
                WHERE ped.fk_id_empresa = ? AND ped.fecha_pedido >= NOW() - INTERVAL '90 days'
                  AND ped.estado_pedido IN ('PAGADO','ENTREGADO')
                GROUP BY p.nombre_producto, u.nombre_usuario, u.id_usuario
            ),
            top_productos AS (
                SELECT nombre_producto, SUM(veces) AS total_veces
                FROM ventas GROUP BY nombre_producto ORDER BY total_veces DESC LIMIT 6
            )
            SELECT v.nombre_producto, v.nombre_usuario, v.veces
            FROM ventas v
            JOIN top_productos tp ON tp.nombre_producto = v.nombre_producto
            WHERE v.rn <= 3
            ORDER BY tp.total_veces DESC, v.nombre_producto, v.veces DESC
            """;
        var filas = jdbc.queryForList(sql, empresaId);
        if (filas.isEmpty()) return "";

        StringBuilder sb = new StringBuilder("\nClientes recurrentes por producto (90d):\n");
        String productoActual = null;
        for (var f : filas) {
            String nombreProducto = (String) f.get("nombre_producto");
            if (!nombreProducto.equals(productoActual)) {
                sb.append(String.format("  %s:%n", nombreProducto));
                productoActual = nombreProducto;
            }
            Object cliente = f.get("nombre_usuario");
            sb.append(String.format("    - %s (%s compras)%n",
                cliente != null ? cliente : "Cliente sin cuenta", f.get("veces")));
        }
        return sb.toString();
    }

    private String getInventarioData(Long empresaId) {
        String sqlBajo = """
            SELECT nombre_producto, stock_actual, stock_minimo, precio_venta, precio_oferta
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1 AND visible_catalogo = TRUE AND vendido = FALSE
              AND stock_actual <= COALESCE(stock_minimo, 3)
            ORDER BY stock_actual ASC LIMIT 10
            """;
        String sqlTotal = """
            SELECT COUNT(*) as total, SUM(stock_actual) as unidades
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1 AND visible_catalogo = TRUE AND vendido = FALSE
            """;
        var bajo  = jdbc.queryForList(sqlBajo, empresaId);
        var total = jdbc.queryForMap(sqlTotal, empresaId);
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Catálogo activo: %s productos / %s unidades en stock%n",
            total.get("total"), total.get("unidades")));
        if (!bajo.isEmpty()) {
            sb.append("Productos con stock crítico:\n");
            bajo.forEach(p -> sb.append(String.format("  - %s: %s unidades (mínimo: %s) — ₡%s%n",
                p.get("nombre_producto"), p.get("stock_actual"),
                p.get("stock_minimo"), p.get("precio_venta"))));
        } else {
            sb.append("No hay productos con stock crítico.\n");
        }
        return sb.toString();
    }

    private String getCatalogoData(Long empresaId) {
        String sql = """
            SELECT nombre_producto, descripcion_corta, precio_venta, precio_oferta,
                   stock_actual, tags
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1
              AND visible_catalogo = TRUE AND vendido = FALSE AND stock_actual > 0
            ORDER BY id_producto DESC LIMIT 20
            """;
        var prods = jdbc.queryForList(sql, empresaId);
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Catálogo disponible (%d productos):%n", prods.size()));
        prods.forEach(p -> {
            String oferta = p.get("precio_oferta") != null ? " (oferta: ₡" + p.get("precio_oferta") + ")" : "";
            sb.append(String.format("  - %s — ₡%s%s | Stock: %s%n",
                p.get("nombre_producto"), p.get("precio_venta"), oferta, p.get("stock_actual")));
            if (p.get("descripcion_corta") != null && !p.get("descripcion_corta").toString().isBlank()) {
                sb.append(String.format("    Desc: %s%n", p.get("descripcion_corta")));
            }
        });
        return sb.toString();
    }

    private String getPedidosPendientesData(Long empresaId) {
        // Solo nombre_usuario — el email es PII innecesaria para que el LLM
        // aconseje sobre despachos y no debe salir hacia la API de NVIDIA.
        String sql = """
            SELECT p.id_pedido, p.estado_pedido, p.total_pedido, p.fecha_pedido,
                   u.nombre_usuario
            FROM hot_click_pedido_tb p
            LEFT JOIN hot_click_usuario_tb u ON p.fk_id_usuario = u.id_usuario
            WHERE p.fk_id_empresa = ?
              AND p.estado_pedido IN ('PAGADO','PROCESANDO','PREPARANDO')
            ORDER BY p.fecha_pedido ASC LIMIT 15
            """;
        var pedidos = jdbc.queryForList(sql, empresaId);
        if (pedidos.isEmpty()) return "No hay pedidos pendientes en este momento.\n";
        java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("%d pedidos pendientes de despachar:%n", pedidos.size()));
        pedidos.forEach(p -> sb.append(String.format("  #%s [%s] ₡%s — %s%n",
            p.get("id_pedido"), p.get("estado_pedido"),
            fmt.format(p.get("total_pedido")),
            p.get("nombre_usuario"))));
        return sb.toString();
    }

    private String getKpiContext(Long empresaId) {
        try {
            String sqlKpis = """
                SELECT COUNT(*) as pedidos_7d,
                       COALESCE(SUM(total_pedido),0) as ingresos_7d
                FROM hot_click_pedido_tb
                WHERE fk_id_empresa = ? AND fecha_pedido >= NOW() - INTERVAL '7 days'
                  AND estado_pedido IN ('PAGADO','ENTREGADO')
                """;
            Map<String, Object> kpis = jdbc.queryForMap(sqlKpis, empresaId);
            java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
            return String.format("Pedidos últimos 7 días: %s | Ingresos: ₡%s",
                kpis.get("pedidos_7d"), fmt.format(kpis.get("ingresos_7d")));
        } catch (DataAccessException e) {
            log.warn("[AI] empresaId={} KPI no disponible: {}", empresaId, e.getMessage());
            return "Datos no disponibles";
        }
    }

    private List<Map<String, Object>> buildMessages(Long empresaId, String userMessage) {
        List<Map<String, Object>> history = aiMensajeRepository
            .findByEmpresaIdOrderByFechaCreacionAsc(empresaId, PageRequest.of(0, HISTORY_TURNS))
            .stream().map(m -> {
                String content = m.getContenido();
                return Map.<String, Object>of("role", m.getRol(), "content", content != null ? content : "");
            })
            .collect(java.util.stream.Collectors.toCollection(ArrayList::new));

        history.add(Map.of("role", "user", "content", userMessage));
        return history;
    }

    private String buildRequestBody(String systemPrompt, List<Map<String, Object>> messages, Long tenantId) {
        return buildRequestBody(systemPrompt, messages, tenantId, true);
    }

    private String buildRequestBody(String systemPrompt, List<Map<String, Object>> messages, Long tenantId, boolean stream) {
        try {
            // Formato OpenAI chat completions: el system prompt va como mensaje, no como
            // campo top-level separado (a diferencia de la Messages API de Claude).
            List<Map<String, Object>> chatMessages = new ArrayList<>();
            chatMessages.add(Map.of("role", "system", "content", systemPrompt));
            chatMessages.addAll(messages);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model",      model);
            body.put("max_tokens", 1024);
            body.put("stream",     stream);
            if (stream) body.put("stream_options", Map.of("include_usage", true));
            body.put("messages",   chatMessages);
            // Stop sequences prevent prompt injection: if a reply tries to impersonate
            // "Human:" or "User:", NVIDIA stops immediately instead of continuing the loop.
            body.put("stop", List.of("\n\nHuman:", "\n\nUser:", "Human:", "User:"));
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new IntegracionExternaException("nvidia-api", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                tenantId, "No se pudo serializar el request a NVIDIA API", e);
        }
    }

    @Transactional
    protected void saveMsg(Empresa empresa, String rol, String contenido, int tokens) {
        if (empresa == null || contenido == null || contenido.isBlank()) return;
        AiMensaje msg = new AiMensaje();
        msg.setEmpresa(empresa);
        msg.setRol(rol);
        msg.setContenido(contenido);
        msg.setTokens(tokens);
        aiMensajeRepository.save(msg);
    }
}
