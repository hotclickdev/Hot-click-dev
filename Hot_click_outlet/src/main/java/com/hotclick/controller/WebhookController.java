package com.hotclick.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    @PostMapping("/payxpert")
    public ResponseEntity<Map<String, String>> recibirWebhookPayXpert(
            @RequestBody(required = false) Object dto,
            HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();
        log.warn("Webhook PayXpert recibido pero proveedor está ARCHIVADO — ip={}", ip);
        return ResponseEntity.status(410).body(Map.of("status", "GONE", "message", "PayXpert archived"));
    }

    @PostMapping("/paypal")
    public ResponseEntity<Map<String, String>> recibirWebhookPayPal(
            @RequestBody(required = false) String rawBody,
            HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();
        log.warn("Webhook PayPal recibido pero proveedor está ARCHIVADO — ip={}", ip);
        return ResponseEntity.status(410).body(Map.of("status", "GONE", "message", "PayPal archived"));
    }
}
