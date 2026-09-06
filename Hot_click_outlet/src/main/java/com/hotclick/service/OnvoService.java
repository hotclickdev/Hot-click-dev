package com.hotclick.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
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

    @Value("${onvo.publishable-key:}")
    private String publishableKey;

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

    public String getPublishableKey() { return publishableKey != null ? publishableKey : ""; }

    public boolean isMockMode() { return mockMode; }

    /** Resultado de crear una sesión de checkout hospedado en ONVO. */
    public record OnvoCheckoutSession(String id, String url) {}

    /** Payment intent para el SDK embebido (Apple Pay, Google Pay, tarjeta). */
    public record OnvoPaymentIntent(String id) {}

    /** Método de pago SINPE Móvil en ONVO. */
    public record OnvoPaymentMethod(String id) {}

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

        try {
            return parseCheckout(postOnvo("/checkout/sessions/one-time-link", body));
        } catch (HttpClientErrorException e) {
            throw new IllegalStateException(OnvoErrorSupport.mensajeCliente(e));
        }
    }

    /**
     * Crea un payment intent para cobro embebido con el Web SDK de ONVO.
     * Monto en unidad menor (colones × 100).
     */
    @CircuitBreaker(name = "onvo", fallbackMethod = "crearPaymentIntentFallback")
    @Retry(name = "onvo")
    public OnvoPaymentIntent crearPaymentIntent(int totalColones, String descripcion,
                                                Map<String, String> metadata) {
        if (mockMode) {
            return new OnvoPaymentIntent("onvo_pi_mock_" + System.currentTimeMillis());
        }

        Map<String, Object> body = new HashMap<>();
        body.put("amount", totalColones * 100L);
        body.put("currency", "CRC");
        body.put("description", descripcion);
        if (metadata != null && !metadata.isEmpty()) {
            body.put("metadata", metadata);
        }

        try {
            return parsePaymentIntent(postOnvo("/payment-intents", body));
        } catch (HttpClientErrorException e) {
            throw new IllegalStateException(OnvoErrorSupport.mensajeCliente(e));
        }
    }

    /**
     * Crea un payment method tipo mobile_number (SINPE Móvil).
     */
    @CircuitBreaker(name = "onvo", fallbackMethod = "crearMetodoPagoSinpeFallback")
    @Retry(name = "onvo")
    public OnvoPaymentMethod crearMetodoPagoSinpe(String identificacion, String numeroE164,
                                                  String nombre, String email) {
        if (mockMode) {
            return new OnvoPaymentMethod("onvo_pm_mock_" + System.currentTimeMillis());
        }
        Map<String, Object> body = cuerpoMetodoSinpe(identificacion, numeroE164, nombre, email);
        try {
            return parsePaymentMethod(postOnvo("/payment-methods", body));
        } catch (HttpClientErrorException e) {
            throw new IllegalStateException(OnvoErrorSupport.mensajeCliente(e));
        }
    }

    @CircuitBreaker(name = "onvo", fallbackMethod = "confirmarPaymentIntentFallback")
    @Retry(name = "onvo")
    public void confirmarPaymentIntent(String intentId, String paymentMethodId) {
        if (mockMode) return;
        try {
            postOnvo("/payment-intents/" + intentId + "/confirm",
                Map.of("paymentMethodId", paymentMethodId));
        } catch (HttpClientErrorException e) {
            throw new IllegalStateException(OnvoErrorSupport.mensajeCliente(e));
        }
    }

    static Map<String, Object> cuerpoMetodoSinpe(String identificacion, String numeroE164,
                                                 String nombre, String email) {
        Map<String, Object> mobile = new HashMap<>();
        mobile.put("identification", identificacion);
        mobile.put("identificationType", 0);
        mobile.put("number", numeroE164);
        Map<String, Object> billing = new HashMap<>();
        billing.put("name", nombre);
        if (email != null && !email.isBlank()) {
            billing.put("email", email);
        }
        Map<String, Object> body = new HashMap<>();
        body.put("type", "mobile_number");
        body.put("mobileNumber", mobile);
        body.put("billing", billing);
        return body;
    }

    public boolean paymentIntentPagado(String intentId) {
        return "succeeded".equalsIgnoreCase(paymentIntentStatus(intentId));
    }

    @CircuitBreaker(name = "onvo", fallbackMethod = "paymentIntentStatusFallback")
    @Retry(name = "onvo")
    public String paymentIntentStatus(String intentId) {
        if (mockMode || intentId == null || intentId.isBlank()) return "";
        try {
            Map<?, ?> body = getOnvo("/payment-intents/" + intentId);
            String status = body == null || body.get("status") == null
                ? "" : String.valueOf(body.get("status"));
            return status;
        } catch (HttpClientErrorException e) {
            log.warn("[onvo] No se pudo leer payment intent {}: {}", intentId, e.getStatusCode());
            return "";
        }
    }

    @SuppressWarnings("rawtypes")
    private Map<?, ?> getOnvo(String path) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(secretKey);
        ResponseEntity<Map> resp = restTemplate.exchange(
            API_BASE + path, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        return resp.getBody();
    }

    @SuppressWarnings("rawtypes")
    private Map<?, ?> postOnvo(String path, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(secretKey);
        ResponseEntity<Map> resp = restTemplate.exchange(
            API_BASE + path, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
        return resp.getBody();
    }

    private OnvoCheckoutSession parseCheckout(Map<?, ?> respBody) {
        if (respBody == null || respBody.get("id") == null || respBody.get("url") == null) {
            throw new IllegalStateException("Respuesta inválida de ONVO al crear checkout session");
        }
        String id = String.valueOf(respBody.get("id"));
        log.info("[onvo] Checkout session creada: {}", id);
        return new OnvoCheckoutSession(id, String.valueOf(respBody.get("url")));
    }

    private OnvoPaymentIntent parsePaymentIntent(Map<?, ?> respBody) {
        if (respBody == null || respBody.get("id") == null) {
            throw new IllegalStateException("Respuesta inválida de ONVO al crear payment intent");
        }
        String id = String.valueOf(respBody.get("id"));
        log.info("[onvo] Payment intent creado: {}", id);
        return new OnvoPaymentIntent(id);
    }

    private OnvoPaymentMethod parsePaymentMethod(Map<?, ?> respBody) {
        if (respBody == null || respBody.get("id") == null) {
            throw new IllegalStateException("Respuesta inválida de ONVO al crear método SINPE");
        }
        return new OnvoPaymentMethod(String.valueOf(respBody.get("id")));
    }

    /** Solo cuando el circuito está OPEN. Cualquier otro fallo se relanza con su causa real. */
    private OnvoPaymentIntent crearPaymentIntentFallback(int totalColones, String descripcion,
                                                         Map<String, String> metadata,
                                                         Throwable t) {
        throw relanzarFalloOnvo("crearPaymentIntent", t);
    }

    private OnvoPaymentMethod crearMetodoPagoSinpeFallback(String identificacion, String numeroE164,
                                                           String nombre, String email, Throwable t) {
        throw relanzarFalloOnvo("crearMetodoPagoSinpe", t);
    }

    private void confirmarPaymentIntentFallback(String intentId, String paymentMethodId, Throwable t) {
        throw relanzarFalloOnvo("confirmarPaymentIntent", t);
    }

    private String paymentIntentStatusFallback(String intentId, Throwable t) {
        throw relanzarFalloOnvo("paymentIntentPagado", t);
    }

    private OnvoCheckoutSession crearCheckoutSessionFallback(int totalColones, String descripcion,
                                                              String successUrl, String cancelUrl,
                                                              String customerEmail, Map<String, String> metadata,
                                                              Throwable t) {
        throw relanzarFalloOnvo("crearCheckoutSession", t);
    }

    private RuntimeException relanzarFalloOnvo(String operacion, Throwable t) {
        if (t instanceof io.github.resilience4j.circuitbreaker.CallNotPermittedException) {
            log.error("[onvo-circuit] OPEN {}: {}", operacion, t.getMessage());
        }
        return OnvoErrorSupport.relanzar(t);
    }
}
