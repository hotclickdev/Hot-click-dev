package com.hotclick.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.service.OnvoService;
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
    private final ObjectMapper objectMapper;

    public OnvoWebhookController(OnvoService onvoService,
                                  OnvoPaymentProvider onvoPaymentProvider,
                                  ObjectMapper objectMapper) {
        this.onvoService = onvoService;
        this.onvoPaymentProvider = onvoPaymentProvider;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/onvo")
    public ResponseEntity<Map<String, String>> recibirWebhookOnvo(
            @RequestBody String payload,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String secretHeader) {

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

        try {
            switch (type) {
                case "checkout-session.succeeded" -> {
                    String sessionId = data.path("id").asText(null);
                    if (sessionId == null) {
                        log.error("[onvo-webhook] checkout-session.succeeded sin id");
                        return ResponseEntity.badRequest().body(Map.of("error", "missing id"));
                    }
                    onvoPaymentProvider.procesarPagoExitoso(sessionId, payload, "webhook");
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
