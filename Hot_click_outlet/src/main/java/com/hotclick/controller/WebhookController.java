package com.hotclick.controller;

import com.hotclick.service.TelegramService;
import com.hotclick.service.IncidentRemediationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final TelegramService telegramService;
    private final IncidentRemediationService remediationService;
    private final String uptimeWebhookSecret;
    private final String sentryWebhookSecret;

    public WebhookController(
            TelegramService telegramService,
            IncidentRemediationService remediationService,
            @Value("${uptime.webhook-secret:}") String uptimeWebhookSecret,
            @Value("${sentry.webhook-secret:}") String sentryWebhookSecret) {
        this.telegramService = telegramService;
        this.remediationService = remediationService;
        this.uptimeWebhookSecret = uptimeWebhookSecret;
        this.sentryWebhookSecret = sentryWebhookSecret;
    }

    @PostMapping("/uptime")
    public ResponseEntity<Map<String, String>> recibirWebhookUptime(
            @RequestParam(required = false) String secret,
            @RequestParam(required = false) String monitorFriendlyName,
            @RequestParam(required = false) String monitorURL,
            @RequestParam(required = false) String alertType,
            @RequestParam(required = false) String alertDetails) {

        if (uptimeWebhookSecret.isBlank() || !uptimeWebhookSecret.equals(secret)) {
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
            @RequestParam(required = false) String secret,
            @RequestBody(required = false) Map<String, Object> body) {

        if (sentryWebhookSecret.isBlank() || !sentryWebhookSecret.equals(secret)) {
            log.warn("Webhook Sentry: secret invalido o no configurado");
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }

        if (body == null) return ResponseEntity.ok(Map.of("status", "ok"));

        String action = String.valueOf(body.getOrDefault("action", ""));
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) body.getOrDefault("data", Map.of());
        @SuppressWarnings("unchecked")
        Map<String, Object> issue = (Map<String, Object>) data.getOrDefault("issue", Map.of());

        String titulo = String.valueOf(issue.getOrDefault("title", "Error desconocido"));
        String nivel  = String.valueOf(issue.getOrDefault("level", "error")).toUpperCase();
        String url    = String.valueOf(issue.getOrDefault("permalink", ""));

        String prefijo = "FATAL".equals(nivel) || "ERROR".equals(nivel) ? "[ERROR]" : "[WARNING]";
        String mensaje = String.format(
                "%s *ERROR EN PRODUCCION*\n\n*Detectado por:* Sentry\n*Nivel:* %s\n*Problema:* %s%s",
                prefijo, nivel, titulo,
                url.isBlank() ? "" : "\n*Ver en Sentry:* " + url);

        telegramService.enviar(mensaje);

        if ("FATAL".equals(nivel) || "ERROR".equals(nivel)) {
            String culprit = String.valueOf(issue.getOrDefault("culprit", ""));
            Object metaObj = issue.getOrDefault("metadata", Map.of());
            String stackTrace = "";
            if (metaObj instanceof Map<?, ?> m && m.containsKey("value")) {
                stackTrace = String.valueOf(m.get("value"));
            }
            remediationService.remediar(titulo, nivel, culprit, url, stackTrace);
        }

        log.info("Webhook Sentry: action={} nivel={} titulo={}", action, nivel, titulo);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
