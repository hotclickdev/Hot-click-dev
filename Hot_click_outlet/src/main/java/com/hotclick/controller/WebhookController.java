package com.hotclick.controller;

import com.hotclick.dto.PaymentWebhookDTO;
import com.hotclick.service.PayXpertService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    @Autowired
    private PayXpertService payXpertService;

    /**
     * Endpoint público que recibe callbacks de PayXpert al completar un pago.
     * PayXpert espera recibir {"status":"OK"} en la respuesta.
     * Siempre respondemos 200 para evitar retries innecesarios de PayXpert.
     */
    @PostMapping("/payxpert")
    public ResponseEntity<Map<String, String>> recibirWebhook(
            @RequestBody PaymentWebhookDTO dto,
            HttpServletRequest request) {

        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();

        log.info("Webhook PayXpert recibido — order={} errorCode={} status={} ip={}",
            dto.getOrderID(), dto.getErrorCode(), dto.getStatus(), ip);

        try {
            payXpertService.procesarWebhook(dto, ip);
            return ResponseEntity.ok(Map.of("status", "OK", "message", "Received"));
        } catch (SecurityException e) {
            log.error("Webhook rechazado por validación de seguridad: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("status", "ERROR", "message", "Security validation failed"));
        } catch (Exception e) {
            log.error("Error procesando webhook PayXpert: {}", e.getMessage(), e);
            // Retornamos 200 igualmente — PayXpert no debe reintentar por errores internos nuestros
            return ResponseEntity.ok(Map.of("status", "ERROR", "message", "Internal processing error"));
        }
    }
}
