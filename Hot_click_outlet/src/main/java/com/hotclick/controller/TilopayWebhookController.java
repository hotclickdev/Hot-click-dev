package com.hotclick.controller;

import com.hotclick.service.payment.TilopayConfirmacionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

/**
 * Webhook Tilopay (contrato pendiente de sac@tilopay.com).
 * Solo encola y reconsulta — no confía en el body sin verificación OrderHash.
 * Si {@code tilopay.webhook-secret} está configurado, exige header {@code X-Webhook-Secret}.
 */
@RestController
@RequestMapping("/api/webhooks")
public class TilopayWebhookController {

    private static final Logger log = LoggerFactory.getLogger(TilopayWebhookController.class);

    @Autowired private TilopayConfirmacionService tilopayConfirmacionService;

    @Value("${tilopay.webhook-secret:}")
    private String webhookSecret;

    @PostMapping("/tilopay")
    public ResponseEntity<Map<String, String>> recibir(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String secretHeader) {
        if (!secretValido(secretHeader)) {
            log.warn("[tilopay-webhook] Secret inválido o ausente");
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }

        String orderNumber = extraerOrder(body);
        log.info("[tilopay-webhook] Recibido order={}", orderNumber);
        try {
            tilopayConfirmacionService.procesarWebhook(
                orderNumber,
                body != null ? "{\"payload\":\"" + body.toString().replace("\"", "'") + "\"}" : "{}");
        } catch (Exception e) {
            log.error("[tilopay-webhook] Error: {}", e.getMessage());
        }
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    /** Si el secret no está configurado, acepta (rollout). Si está, comparación constante. */
    boolean secretValido(String secretHeader) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            return true;
        }
        if (secretHeader == null) {
            return false;
        }
        byte[] a = webhookSecret.getBytes(StandardCharsets.UTF_8);
        byte[] b = secretHeader.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }

    private static String extraerOrder(Map<String, Object> body) {
        if (body == null) {
            return null;
        }
        Object o = body.get("orderNumber");
        if (o == null) {
            o = body.get("order");
        }
        return o != null ? String.valueOf(o) : null;
    }
}
