package com.hotclick.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.service.OnvoService;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Recibe eventos de ONVO Pay via webhook.
 * ONVO autentica el webhook con el header X-Webhook-Secret (comparación
 * contra el secret configurado en el dashboard, no una firma HMAC).
 *
 * Ruta pública: Spring Security permite POST /api/webhooks/onvo sin JWT
 * (SecurityConfig.java, patrón /api/webhooks/**), la autenticidad la valida
 * el header del secret.
 *
 * El cuerpo nunca confirma nada: con un secret válido solo dispara la reconsulta a ONVO por GET.
 * Responde 2xx solo si el evento quedó procesado; si ONVO aún no confirma el cobro, devuelve
 * error para que ONVO reintente la entrega.
 */
@RestController
@RequestMapping("/api/webhooks")
public class OnvoWebhookController {

    private static final Logger log = LoggerFactory.getLogger(OnvoWebhookController.class);

    private final OnvoService onvoService;
    private final OnvoPaymentProvider onvoPaymentProvider;
    private final PosQrVentaService posQrVentaService;
    private final OnvoBillingWebhookHandler billingWebhookHandler;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.hotclick.service.sinpe.SinpeOnvoMarketplaceService sinpeMarketplace;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.hotclick.monitoreo.OnvoWebhookSecretInvalidoAlerta alertaSecretInvalido;

    void setAlertaSecretInvalidoParaTest(com.hotclick.monitoreo.OnvoWebhookSecretInvalidoAlerta a) { this.alertaSecretInvalido = a; }

    void setSinpeMarketplaceParaTest(com.hotclick.service.sinpe.SinpeOnvoMarketplaceService s) { this.sinpeMarketplace = s; }

    /** Tope de cuerpo y de intentos con secret inválido por minuto (un secret válido nunca se limita). */
    static final int MAX_BODY_BYTES = 64 * 1024;
    static final int MAX_SECRET_INVALIDO_POR_MINUTO = 30;
    private final AtomicLong minutoActual = new AtomicLong();
    private final AtomicInteger secretInvalidos = new AtomicInteger();

    public OnvoWebhookController(OnvoService onvoService,
                                  OnvoPaymentProvider onvoPaymentProvider,
                                  PosQrVentaService posQrVentaService,
                                  OnvoBillingWebhookHandler billingWebhookHandler,
                                  ObjectMapper objectMapper) {
        this.onvoService = onvoService;
        this.onvoPaymentProvider = onvoPaymentProvider;
        this.posQrVentaService = posQrVentaService;
        this.billingWebhookHandler = billingWebhookHandler;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/onvo")
    public ResponseEntity<Map<String, String>> recibirWebhookOnvo(
            @RequestBody String payload,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String secretHeader) {

        if (payload != null && payload.getBytes(StandardCharsets.UTF_8).length > MAX_BODY_BYTES) {
            return ResponseEntity.status(413).body(Map.of("error", "payload too large"));
        }
        if (!secretValido(secretHeader)) {
            if (!dentroDelLimite()) {
                return ResponseEntity.status(429).body(Map.of("error", "too many requests"));
            }
            // INF-03: nivel error para que llegue a Sentry; sin el secret recibido ni datos del cuerpo.
            log.error("[onvo-webhook] 401: secret inválido o no configurado");
            if (alertaSecretInvalido != null) alertaSecretInvalido.registrarFallo();
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(payload);
        } catch (Exception e) {
            log.error("[onvo-webhook] Error al parsear payload: {}", e.getMessage());
            return ResponseEntity.status(400).body(Map.of("error", "bad request"));
        }

        String type = root.path("type").asText("");
        JsonNode data = root.path("data");
        String eventId = root.path("id").asText(null);

        try {
            if (billingWebhookHandler.manejarSiBilling(type, data, eventId)) {
                return ResponseEntity.ok(Map.of("status", "ok", "type", type, "scope", "billing"));
            }
            switch (type) {
                case "checkout-session.succeeded" -> {
                    String sessionId = data.path("id").asText(null);
                    if (sessionId == null) {
                        log.error("[onvo-webhook] checkout-session.succeeded sin id");
                        return ResponseEntity.badRequest().body(Map.of("error", "missing id"));
                    }
                    ResponseEntity<Map<String, String>> resp = respuestaVerificacion(
                        onvoPaymentProvider.procesarPagoVerificado(sessionId, "webhook"), type);
                    if (resp != null) return resp;
                }
                case "payment-intent.succeeded" -> {
                    String intentId = data.path("id").asText(null);
                    if (intentId == null) {
                        log.error("[onvo-webhook] payment-intent.succeeded sin id");
                        return ResponseEntity.badRequest().body(Map.of("error", "missing id"));
                    }
                    // P-01: SINPE del marketplace, resuelto por el ONVOPI:<id> guardado en el pago.
                    if (sinpeMarketplace != null) {
                        var r = sinpeMarketplace.confirmarPorWebhook(type, intentId);
                        ResponseEntity<Map<String, String>> resp = respuestaSinpe(r, type);
                        if (resp != null) return resp;
                    }
                    // SINPE del POS por ONVO: se relee el intent por GET (monto/moneda exactos) y recién ahí se cierra la venta.
                    // ONVO no manda id de evento: dedupe por tipo + data.id.
                    boolean pos = posQrVentaService != null
                        && posQrVentaService.confirmarSinpeOnvoPorWebhook(intentId, claveEvento(type, intentId));
                    log.info("[onvo-webhook] payment-intent.succeeded {} posCerrado={}", intentId, pos);
                }
                case "payment-intent.deferred" ->
                    // Espera de aprobación (flujo SINPE): no es pago; se sigue esperando succeeded.
                    log.info("[onvo-webhook] payment-intent.deferred {}: en espera", data.path("id").asText(""));
                case "payment-intent.failed" -> {
                    String intentId = data.path("id").asText(null);
                    if (intentId == null) {
                        log.error("[onvo-webhook] payment-intent.failed sin id");
                        return ResponseEntity.badRequest().body(Map.of("error", "missing id"));
                    }
                    if (sinpeMarketplace != null && sinpeMarketplace.esDelMarketplace(intentId)) {
                        // P-01: failed no revierte (puede llegar después de succeeded) ni libera stock: lo hace el
                        // barrido del plazo interno solo con canceled confirmado por GET.
                        log.info("[onvo-webhook] payment-intent.failed {} de SINPE marketplace: sin cambios", intentId);
                    } else {
                        // Solo se registra: el comprador puede reintentar en la misma sesión de checkout.
                        onvoPaymentProvider.registrarIntentFallido(intentId, "webhook");
                    }
                }
                default -> log.debug("[onvo-webhook] Evento ignorado: {}", type);
            }
        } catch (Exception e) {
            log.error("[onvo-webhook] Error procesando {}: {}", type, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "processing error"));
        }

        return ResponseEntity.ok(Map.of("status", "ok", "type", type));
    }

    /** Clave de dedupe (ONVO no manda id de evento): tipo + data.id. */
    static String claveEvento(String type, String dataId) {
        return type + ":" + dataId;
    }

    /** null = no es del marketplace (sigue el POS). */
    static ResponseEntity<Map<String, String>> respuestaSinpe(
            com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.Resultado r, String type) {
        return switch (r) {
            case NO_ENCONTRADO -> null;
            case CONFIRMADO -> ResponseEntity.ok(Map.of("status", "ok", "type", type, "scope", "sinpe"));
            case DUPLICADO -> ResponseEntity.ok(Map.of("status", "duplicate", "type", type));
            case COBRADO_SOBRE_CANCELADO, COBRADO_SOBREVENTA -> ResponseEntity.ok(Map.of("status", "refund_pending", "type", type));
            case NO_CONSULTABLE -> ResponseEntity.status(503).body(Map.of("error", "unavailable"));
            case EN_ESPERA, NO_VERIFICADO -> ResponseEntity.status(409).body(Map.of("error", "not verified"));
        };
    }

    /** null = seguir con la respuesta 200 normal. */
    private static ResponseEntity<Map<String, String>> respuestaVerificacion(
            OnvoPaymentProvider.Verificacion v, String type) {
        return switch (v) {
            case OK -> null;
            case DUPLICADO -> ResponseEntity.ok(Map.of("status", "duplicate", "type", type));
            // Procesado: queda para reembolso del admin; reintentar no cambia nada.
            case COBRADO_SOBRE_CANCELADO, COBRADO_SOBREVENTA -> ResponseEntity.ok(Map.of("status", "refund_pending", "type", type));
            case NO_ENCONTRADO -> ResponseEntity.status(404).body(Map.of("error", "not found"));
            // Sin llave no se pudo verificar: error temporal para que ONVO reintente cuando vuelva la llave.
            case NO_CONSULTABLE -> ResponseEntity.status(503).body(Map.of("error", "unavailable"));
            case EN_PROCESO, NO_PAGADO, DATOS_DISTINTOS ->
                ResponseEntity.status(409).body(Map.of("error", "not verified"));
        };
    }

    boolean dentroDelLimite() {
        long minuto = System.currentTimeMillis() / 60_000;
        if (minutoActual.getAndSet(minuto) != minuto) secretInvalidos.set(0);
        return secretInvalidos.incrementAndGet() <= MAX_SECRET_INVALIDO_POR_MINUTO;
    }

    /** Comparación de tiempo constante para evitar timing attacks sobre el secret. */
    private boolean secretValido(String secretHeader) {
        String expected = onvoService.getWebhookSecret();
        if (expected == null || expected.isBlank() || secretHeader == null) return false;
        byte[] a = expected.getBytes(StandardCharsets.UTF_8);
        byte[] b = secretHeader.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }
}
