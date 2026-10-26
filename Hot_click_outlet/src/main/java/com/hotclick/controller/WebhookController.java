package com.hotclick.controller;

import com.hotclick.sentry.SentryWebhookService;
import com.hotclick.service.TelegramService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    /** H-02: el secret viaja en header (no en query string, que queda en logs de proxy/ALB). */
    public static final String HEADER_SECRET = "X-Webhook-Secret";

    private final TelegramService telegramService;
    private final SentryWebhookService sentryWebhookService;
    private final String uptimeWebhookSecret;
    private final String sentryWebhookSecret;

    public WebhookController(
            TelegramService telegramService,
            SentryWebhookService sentryWebhookService,
            @Value("${uptime.webhook-secret:}") String uptimeWebhookSecret,
            @Value("${sentry.webhook-secret:}") String sentryWebhookSecret) {
        this.telegramService = telegramService;
        this.sentryWebhookService = sentryWebhookService;
        this.uptimeWebhookSecret = uptimeWebhookSecret;
        this.sentryWebhookSecret = sentryWebhookSecret;
    }

    @PostMapping("/uptime")
    public ResponseEntity<Map<String, String>> recibirWebhookUptime(
            @RequestHeader(value = HEADER_SECRET, required = false) String secret,
            @RequestParam(required = false) String monitorFriendlyName,
            @RequestParam(required = false) String monitorURL,
            @RequestParam(required = false) String alertType,
            @RequestParam(required = false) String alertDetails) {

        if (!secretValido(uptimeWebhookSecret, secret)) {
            log.warn("Webhook UptimeRobot: secret invalido o no configurado");
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }

        boolean caido = "1".equals(alertType);
        String estado = caido ? "[ALERTA] SERVIDOR CAIDO" : "[OK] SERVIDOR RECUPERADO";
        String mensaje = String.format(
                "*%s*\n\n*Detectado por:* UptimeRobot\n*Monitor:* %s\n*URL:* %s%s",
                estado,
                monitorFriendlyName != null ? monitorFriendlyName : "-",
                monitorURL != null ? monitorURL : "-",
                alertDetails != null && !alertDetails.isBlank() ? "\n*Detalle:* " + alertDetails : "");

        telegramService.enviar(mensaje);
        log.info("Webhook UptimeRobot: alerta tipo={} monitor={}", alertType, monitorFriendlyName);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @PostMapping("/payxpert")
    public ResponseEntity<Void> payxpertWebhookArchivado(@RequestBody(required = false) String body) {
        return ResponseEntity.status(HttpStatus.GONE).build();
    }

    @PostMapping("/sentry")
    public ResponseEntity<Map<String, String>> recibirWebhookSentry(
            @RequestHeader(value = HEADER_SECRET, required = false) String secret,
            @RequestBody(required = false) Map<String, Object> body) {

        if (!secretValido(sentryWebhookSecret, secret)) {
            log.warn("Webhook Sentry: secret invalido o no configurado");
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }

        sentryWebhookService.procesar(body);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    /** Comparación en tiempo constante; secret no configurado = siempre rechaza (fail-closed). */
    static boolean secretValido(String esperado, String recibido) {
        if (esperado == null || esperado.isBlank() || recibido == null) return false;
        return MessageDigest.isEqual(
                esperado.getBytes(StandardCharsets.UTF_8),
                recibido.getBytes(StandardCharsets.UTF_8));
    }
}
