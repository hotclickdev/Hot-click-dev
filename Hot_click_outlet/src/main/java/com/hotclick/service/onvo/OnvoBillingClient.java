package com.hotclick.service.onvo;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
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
 * Cliente HTTP ONVO para suscripciones SaaS (customer, subscription, cambio de price).
 */
@Service
public class OnvoBillingClient {

    private static final Logger log = LoggerFactory.getLogger(OnvoBillingClient.class);
    private static final String API_BASE = "https://api.onvopay.com/v1";

    @Value("${onvo.secret-key:}")
    private String secretKey;

    @Value("${onvo.price-id.pyme:}")
    private String priceIdPyme;

    @Value("${onvo.price-id.negocio-plus:}")
    private String priceIdNegocioPlus;

    private final RestTemplate restTemplate;

    public OnvoBillingClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public boolean isMockMode() {
        return secretKey == null || secretKey.isBlank();
    }

    public String getPriceIdForPlan(String planNombre) {
        if (planNombre == null) return null;
        return switch (planNombre.toUpperCase()) {
            case "PYME" -> blankToNull(priceIdPyme);
            case "NEGOCIO_PLUS" -> blankToNull(priceIdNegocioPlus);
            default -> null;
        };
    }

    public record OnvoCustomer(String id) {}

    public record OnvoSubscription(String id, String itemId) {}

    @CircuitBreaker(name = "onvo", fallbackMethod = "crearCustomerFallback")
    @Retry(name = "onvo")
    public OnvoCustomer crearCustomer(String email, String nombre, Map<String, String> metadata) {
        if (isMockMode()) {
            return new OnvoCustomer("cus_mock_" + System.currentTimeMillis());
        }
        Map<String, Object> body = new HashMap<>();
        body.put("email", email);
        body.put("name", nombre);
        if (metadata != null && !metadata.isEmpty()) {
            body.put("metadata", metadata);
        }
        Map<?, ?> resp = post("/customers", body);
        return new OnvoCustomer(requireId(resp, "customer"));
    }

    /**
     * Crea suscripción incompleta para cobrar con el Web SDK (paymentType=subscription).
     */
    @CircuitBreaker(name = "onvo", fallbackMethod = "crearSuscripcionFallback")
    @Retry(name = "onvo")
    public OnvoSubscription crearSuscripcionIncompleta(String customerId, String priceId,
                                                       Map<String, String> metadata) {
        if (isMockMode()) {
            return new OnvoSubscription("sub_mock_" + System.currentTimeMillis(), "item_mock");
        }
        Map<String, Object> body = new HashMap<>();
        body.put("customerId", customerId);
        body.put("paymentBehavior", "allow_incomplete");
        body.put("items", List.of(Map.of("priceId", priceId, "quantity", 1)));
        if (metadata != null && !metadata.isEmpty()) {
            body.put("metadata", metadata);
        }
        Map<?, ?> resp = post("/subscriptions", body);
        String subId = requireId(resp, "subscription");
        String itemId = extraerPrimerItemId(resp);
        return new OnvoSubscription(subId, itemId);
    }

    @CircuitBreaker(name = "onvo", fallbackMethod = "cambiarPrecioFallback")
    @Retry(name = "onvo")
    public void cambiarPrecioSuscripcion(String subscriptionId, String itemId, String nuevoPriceId) {
        if (isMockMode()) {
            log.info("[onvo-mock] cambiarPrecio sub={} item={} price={}", subscriptionId, itemId, nuevoPriceId);
            return;
        }
        if (itemId == null || itemId.isBlank()) {
            throw new IllegalStateException("Suscripción ONVO sin itemId para cambiar plan");
        }
        Map<String, Object> body = Map.of("priceId", nuevoPriceId);
        patch("/subscriptions/" + subscriptionId + "/items/" + itemId, body);
        log.info("[onvo] Precio actualizado sub={} item={} price={}", subscriptionId, itemId, nuevoPriceId);
    }

    @CircuitBreaker(name = "onvo", fallbackMethod = "cancelarFallback")
    @Retry(name = "onvo")
    public void cancelarAlVencer(String subscriptionId) {
        if (isMockMode() || subscriptionId == null || subscriptionId.startsWith("sub_mock")) {
            log.info("[onvo-mock] cancelarAlVencer({})", subscriptionId);
            return;
        }
        Map<String, Object> body = Map.of("cancelAtPeriodEnd", true);
        post("/subscriptions/" + subscriptionId + "/cancel", body);
        log.info("[onvo] Suscripción marcada cancelAtPeriodEnd: {}", subscriptionId);
    }

    @SuppressWarnings("unchecked")
    public String obtenerPrimerItemId(String subscriptionId) {
        if (isMockMode()) return "item_mock";
        Map<?, ?> resp = get("/subscriptions/" + subscriptionId);
        return extraerPrimerItemId(resp);
    }

    private Map<?, ?> get(String path) {
        ResponseEntity<Map> resp = restTemplate.exchange(
            API_BASE + path, HttpMethod.GET, new HttpEntity<>(authHeaders()), Map.class);
        return resp.getBody() != null ? resp.getBody() : Map.of();
    }

    private Map<?, ?> post(String path, Map<String, Object> body) {
        ResponseEntity<Map> resp = restTemplate.exchange(
            API_BASE + path, HttpMethod.POST, new HttpEntity<>(body, authHeaders()), Map.class);
        return resp.getBody() != null ? resp.getBody() : Map.of();
    }

    private void patch(String path, Map<String, Object> body) {
        restTemplate.exchange(
            API_BASE + path, HttpMethod.PATCH, new HttpEntity<>(body, authHeaders()), Map.class);
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(secretKey);
        return headers;
    }

    private static String requireId(Map<?, ?> resp, String recurso) {
        Object id = resp.get("id");
        if (id == null) {
            throw new IllegalStateException("Respuesta ONVO sin id al crear " + recurso);
        }
        return String.valueOf(id);
    }

    @SuppressWarnings("unchecked")
    private static String extraerPrimerItemId(Map<?, ?> resp) {
        Object items = resp.get("items");
        if (items instanceof List<?> list && !list.isEmpty()) {
            Object first = list.get(0);
            if (first instanceof Map<?, ?> item && item.get("id") != null) {
                return String.valueOf(item.get("id"));
            }
        }
        Object data = resp.get("data");
        if (data instanceof Map<?, ?> dataMap) {
            return extraerPrimerItemId(dataMap);
        }
        return null;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private OnvoCustomer crearCustomerFallback(String email, String nombre,
                                               Map<String, String> metadata, Throwable t) {
        log.error("[onvo-circuit] OPEN crearCustomer: {}", t.getMessage());
        throw new IllegalStateException("Servicio de pagos no disponible temporalmente", t);
    }

    private OnvoSubscription crearSuscripcionFallback(String customerId, String priceId,
                                                      Map<String, String> metadata, Throwable t) {
        log.error("[onvo-circuit] OPEN crearSuscripcion: {}", t.getMessage());
        throw new IllegalStateException("Servicio de pagos no disponible temporalmente", t);
    }

    private void cambiarPrecioFallback(String subscriptionId, String itemId,
                                       String nuevoPriceId, Throwable t) {
        log.error("[onvo-circuit] OPEN cambiarPrecio: {}", t.getMessage());
        throw new IllegalStateException("Servicio de pagos no disponible temporalmente", t);
    }

    private void cancelarFallback(String subscriptionId, Throwable t) {
        log.error("[onvo-circuit] OPEN cancelar: {}", t.getMessage());
        throw new IllegalStateException("Servicio de pagos no disponible temporalmente", t);
    }
}
