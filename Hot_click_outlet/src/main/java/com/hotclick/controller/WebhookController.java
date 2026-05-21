package com.hotclick.controller;

import com.hotclick.dto.PaymentWebhookDTO;
import com.hotclick.payment.PayPalPaymentProvider;
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

    @Autowired private PayPalPaymentProvider payPalProvider;

    // TODO[PAYXPERT-REACTIVAR]: Para reactivar PayXpert, restaurar el handler completo
    // desde archive/payxpert/REACTIVACION.md y quitar este bloque de 410.
    @PostMapping("/payxpert")
    public ResponseEntity<Map<String, String>> recibirWebhookPayXpert(
            @RequestBody(required = false) PaymentWebhookDTO dto,
            HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();
        log.warn("Webhook PayXpert recibido pero proveedor está ARCHIVADO — ip={}", ip);
        return ResponseEntity.status(410).body(Map.of("status", "GONE", "message", "PayXpert archived"));
    }

    /**
     * Callback de PayPal para eventos de pago (PAYMENT.CAPTURE.COMPLETED, etc.).
     * Valida la firma de PayPal antes de procesar.
     * Actúa como respaldo al capture directo: si el usuario no regresó a nuestra página,
     * el webhook confirma el pedido igualmente.
     */
    @PostMapping("/paypal")
    public ResponseEntity<Map<String, String>> recibirWebhookPayPal(
            @RequestBody String rawBody,
            HttpServletRequest request) {

        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();

        log.info("Webhook PayPal recibido — event={} ip={}",
            request.getHeader("PAYPAL-TRANSMISSION-ID"), ip);

        try {
            payPalProvider.procesarWebhook(rawBody, request);
            return ResponseEntity.ok(Map.of("status", "OK"));
        } catch (SecurityException e) {
            log.error("Webhook PayPal rechazado: {}", e.getMessage());
            // Respondemos 200 para evitar reintentos, pero logueamos el fallo
            return ResponseEntity.ok(Map.of("status", "ERROR", "message", "Signature invalid"));
        } catch (Exception e) {
            log.error("Error procesando webhook PayPal: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("status", "ERROR", "message", "Internal error"));
        }
    }
}
