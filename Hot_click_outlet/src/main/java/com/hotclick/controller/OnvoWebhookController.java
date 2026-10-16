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

/**
 * Recibe eventos de ONVO Pay via webhook.
 * ONVO autentica el webhook con el header X-Webhook-Secret (comparación
 * contra el secret configurado en el dashboard, no una firma HMAC).
 *
 * Ruta pública: Spring Security permite POST /api/webhooks/onvo sin JWT
 * (SecurityConfig.java, patrón /api/webhooks/**), la autenticidad la valida
 * el header del secret.
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

    /** WH-1: tope de cuerpo y de intentos (además del límite en nginx). */
    static final int MAX_BODY_BYTES = 64 * 1024;
    static final int MAX_INTENTOS_POR_MINUTO = 120;
    private final java.util.concurrent.atomic.AtomicLong ventana = new java.util.concurrent.atomic.AtomicLong();
    private final java.util.concurrent.atomic.AtomicInteger intentos = new java.util.concurrent.atomic.AtomicInteger();

    boolean dentroDelLimite() {
        long minuto = System.currentTimeMillis() / 60_000;
        if (ventana.getAndSet(minuto) != minuto) intentos.set(0);
        return intentos.incrementAndGet() <= MAX_INTENTOS_POR_MINUTO;
    }

    @PostMapping("/onvo")
    public ResponseEntity<Map<String, String>> recibirWebhookOnvo(
            @RequestBody String payload,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String secretHeader) {

        if (!dentroDelLimite()) {
            return ResponseEntity.status(429).body(Map.of("error", "too many requests"));
        }
        if (payload != null && payload.getBytes(StandardCharsets.UTF_8).length > MAX_BODY_BYTES) {
            return ResponseEntity.status(413).body(Map.of("error", "payload too large"));
        }
        if (!secretValido(secretHeader)) {
            log.warn("[onvo-webhook] Secret inválido o no configurado");
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
                    // WH-1: se consulta la sesión con un GET a ONVO y se usa solo esa respuesta.
                    var v = onvoPaymentProvider.procesarPagoVerificado(
                        sessionId, onvoService.obtenerCheckoutSession(sessionId), "webhook");
                    if (v == OnvoPaymentProvider.Verificacion.DATOS_DISTINTOS
                            || v == OnvoPaymentProvider.Verificacion.NO_PAGADO
                            || v == OnvoPaymentProvider.Verificacion.NO_ENCONTRADO) {
                        return ResponseEntity.badRequest().body(Map.of("error", "not verified"));
                    }
                    if (v == OnvoPaymentProvider.Verificacion.DUPLICADO) {
                        return ResponseEntity.ok(Map.of("status", "duplicate", "type", type));
                    }
                }
                case "payment-intent.succeeded" -> {
                    String intentId = data.path("id").asText(null);
                    if (intentId == null) {
                        log.error("[onvo-webhook] payment-intent.succeeded sin id");
                        return ResponseEntity.badRequest().body(Map.of("error", "missing id"));
                    }
                    // El POS ya no cobra por ONVO (Tilopay); aquí no se completa ninguna sesión POS.
                    log.debug("[onvo-webhook] payment-intent.succeeded: {}", intentId);
                }
                case "payment-intent.failed" -> {
                    String motivo = data.path("error").path("message").asText("sin_detalle");
                    log.warn("[onvo-webhook] payment-intent.failed id={} motivo='{}'",
                        data.path("id").asText(""), motivo);
                }
                default -> log.debug("[onvo-webhook] Evento ignorado: {}", type);
            }
        } catch (Exception e) {
            log.error("[onvo-webhook] Error procesando {}: {}", type, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "processing error"));
        }

        return ResponseEntity.ok(Map.of("status", "ok", "type", type));
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
