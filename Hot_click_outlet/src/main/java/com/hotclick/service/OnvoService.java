package com.hotclick.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Cliente HTTP para la API de ONVO Pay (pasarela de tarjetas costarricense).
 * Sin onvo.secret-key, solo los perfiles dev y test simulan ONVO con datos ficticios.
 * En cualquier otro perfil queda cerrado: ninguna operación crea cobros ni los da por pagados.
 */
@Service
public class OnvoService {

    private static final Logger log = LoggerFactory.getLogger(OnvoService.class);
    private static final String API_BASE = "https://api.onvopay.com/v1";
    private static final Pattern ID_ONVO = Pattern.compile("[A-Za-z0-9_-]{1,100}");

    @Value("${onvo.secret-key:}")
    private String secretKey;

    @Value("${onvo.webhook-secret:}")
    private String webhookSecret;

    @Value("${onvo.publishable-key:}")
    private String publishableKey;

    private final RestTemplate restTemplate;

    @Autowired(required = false)
    private Environment environment;

    private boolean mockMode = false;
    private boolean pagosDisponibles = false;

    public OnvoService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @PostConstruct
    public void init() {
        boolean credenciales = secretKey != null && !secretKey.isBlank();
        mockMode = !credenciales && perfilDeSimulacion();
        pagosDisponibles = credenciales || mockMode;
        if (mockMode) {
            log.warn("[onvo] Sin ONVO_SECRET_KEY en perfil dev/test — modo simulado. No cobra tarjetas reales.");
            return;
        }
        if (!credenciales) {
            log.error("[ALERTA-PAGO] ONVO sin ONVO_SECRET_KEY fuera de dev/test. Pagos con tarjeta deshabilitados.");
            return;
        }
        log.info("[onvo] Cliente inicializado (live={})", !secretKey.startsWith("onvo_test_"));
    }

    private boolean perfilDeSimulacion() {
        return environment != null && environment.acceptsProfiles(Profiles.of(com.hotclick.config.PerfilesSeguros.DEV_O_TEST_ESTRICTO));
    }

    /** Sin llave fuera de dev/test: falla antes de tocar ONVO o de inventar un id. */
    private void exigirPagosDisponibles() {
        if (!pagosDisponibles) {
            throw new IllegalStateException("ONVO no está configurado. No se procesó el pago.");
        }
    }

    public boolean isPagosDisponibles() { return pagosDisponibles; }

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
        exigirPagosDisponibles();

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
        exigirPagosDisponibles();

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
        exigirPagosDisponibles();
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
        exigirPagosDisponibles();
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
        if (!consultable(intentId)) return "";
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

    /**
     * Lee la checkout session en ONVO (GET /v1/checkout/sessions/{id}). La confirmación de un pedido
     * usa esta respuesta, nunca el cuerpo del webhook. Vacío si ONVO no la tiene o no hay llave.
     */
    @CircuitBreaker(name = "onvo", fallbackMethod = "lecturaFallback")
    @Retry(name = "onvo")
    public Map<?, ?> obtenerCheckoutSession(String sessionId) {
        return leer("/checkout/sessions/", sessionId);
    }

    /** Lee el payment intent en ONVO (GET /v1/payment-intents/{id}): estado, monto en céntimos y moneda. */
    @CircuitBreaker(name = "onvo", fallbackMethod = "lecturaFallback")
    @Retry(name = "onvo")
    public Map<?, ?> obtenerPaymentIntent(String intentId) {
        return leer("/payment-intents/", intentId);
    }

    /** 4xx (no existe o no es de esta cuenta) da vacío; 5xx y red se relanzan para reintentar después. */
    private Map<?, ?> leer(String ruta, String id) {
        if (!consultable(id)) return Map.of();
        try {
            Map<?, ?> body = getOnvo(ruta + id);
            return body == null ? Map.of() : body;
        } catch (HttpClientErrorException e) {
            log.warn("[onvo] No se pudo leer {}{}: {}", ruta, id, e.getStatusCode());
            return Map.of();
        }
    }

    /** Mock o sin llave no consultan; el id viaja en la URL y solo se aceptan ids con forma de ONVO. */
    private boolean consultable(String id) {
        return !mockMode && pagosDisponibles && id != null && ID_ONVO.matcher(id).matches();
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

    private Map<?, ?> lecturaFallback(String id, Throwable t) {
        throw relanzarFalloOnvo("lectura", t);
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
