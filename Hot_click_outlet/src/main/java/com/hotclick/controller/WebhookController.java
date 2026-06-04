package com.hotclick.controller;

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

        // Verificar firma síncronamente (necesita HttpServletRequest activo)
        try {
            payPalProvider.verificarFirmaWebhook(rawBody, request);
        } catch (SecurityException e) {
            log.error("Webhook PayPal rechazado: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("status", "ERROR", "message", "Signature invalid"));
        } catch (Exception e) {
            log.error("Error verificando firma PayPal: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("status", "ERROR", "message", "Verification failed"));
        }

        // Despachar procesamiento async — responder 200 antes del timeout de 30s de PayPal
        payPalProvider.procesarContenidoAsync(rawBody, ip);
        return ResponseEntity.ok(Map.of("status", "OK"));
    }
}
