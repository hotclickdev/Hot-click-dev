package com.hotclick.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Cliente HTTP para la API de ONVO Pay (pasarela de tarjetas costarricense).
 * En modo mock (onvo.secret-key vacío) las operaciones retornan datos ficticios
 * para no requerir cuenta ONVO en desarrollo local.
 */
@Service
public class OnvoService {

    private static final Logger log = LoggerFactory.getLogger(OnvoService.class);
    private static final String API_BASE = "https://api.onvopay.com/v1";

    @Value("${onvo.secret-key:}")
    private String secretKey;

    @Value("${onvo.webhook-secret:}")
    private String webhookSecret;

    private final RestTemplate restTemplate;

    private boolean mockMode = false;

    public OnvoService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @PostConstruct
    public void init() {
        if (secretKey == null || secretKey.isBlank()) {
            mockMode = true;
            log.warn("[onvo] ONVO_SECRET_KEY no configurado — modo MOCK activo. " +
                     "Pagos con tarjeta lanzarán error hasta configurar la clave.");
            return;
        }
        log.info("[onvo] Cliente inicializado (live={})", !secretKey.startsWith("onvo_test_"));
    }

    public String getWebhookSecret() { return webhookSecret; }

    public boolean isMockMode() { return mockMode; }

    /** Resultado de crear una sesión de checkout hospedado en ONVO. */
    public record OnvoCheckoutSession(String id, String url) {}

    /**
     * Crea una sesión de checkout hospedado en modo pago único (one-time-link).
     * Los montos se envían en la unidad menor de la moneda (colones × 100).
     */
    @CircuitBreaker(name = "onvo", fallbackMethod = "crearCheckoutSessionFallback")
    @Retry(name = "onvo")
    public OnvoCheckoutSession crearCheckoutSession(int totalColones, String descripcion,
                                                    String successUrl, String cancelUrl,
                                                    String customerEmail, Map<String, String> metadata) {
        if (mockMode) {
            return new OnvoCheckoutSession("onvo_mock_" + System.currentTimeMillis(), successUrl);
        }

        Map<String, Object> lineItem = Map.of(
            "quantity", 1,
            "unitAmount", totalColones * 100L,
            "currency", "CRC",
            "description", descripcion
        );

        Map<String, Object> body = new HashMap<>();
        body.put("lineItems", List.of(lineItem));
        body.put("redirectUrl", successUrl);
        body.put("cancelUrl", cancelUrl);
        body.put("metadata", metadata);
        if (customerEmail != null && !customerEmail.isBlank()) {
            body.put("customerEmail", customerEmail);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(secretKey);

        ResponseEntity<Map> resp = restTemplate.exchange(
            API_BASE + "/checkout/sessions/one-time-link",
            HttpMethod.POST,
            new HttpEntity<>(body, headers),
            Map.class
        );

        Map<?, ?> respBody = resp.getBody();
        if (respBody == null || respBody.get("id") == null || respBody.get("url") == null) {
            throw new IllegalStateException("Respuesta inválida de ONVO al crear checkout session");
        }

        String id  = String.valueOf(respBody.get("id"));
        String url = String.valueOf(respBody.get("url"));
        log.info("[onvo] Checkout session creada: {}", id);
        return new OnvoCheckoutSession(id, url);
    }

    // fallback — invocado por Resilience4j cuando el circuit está OPEN o se agota el retry

    private OnvoCheckoutSession crearCheckoutSessionFallback(int totalColones, String descripcion,
                                                              String successUrl, String cancelUrl,
                                                              String customerEmail, Map<String, String> metadata,
                                                              Throwable t) {
        log.error("[onvo-circuit] OPEN crearCheckoutSession: {}", t.getMessage());
        throw new IllegalStateException("Servicio de pagos no disponible temporalmente", t);
    }
}
