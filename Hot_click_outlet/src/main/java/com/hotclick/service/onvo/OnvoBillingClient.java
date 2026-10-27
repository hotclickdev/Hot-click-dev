package com.hotclick.service.onvo;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Cliente HTTP ONVO para suscripciones SaaS (customer, subscription, cambio de price).
 */
@Service
public class OnvoBillingClient {

    private static final Logger log = LoggerFactory.getLogger(OnvoBillingClient.class);
    private static final String API_BASE = "https://api.onvopay.com/v1";
    /** Simulación solo en dev/test y nunca si además está activo un perfil productivo (igual que Flyway). */
    static final Profiles PERFIL_SIMULACION = Profiles.of("(dev | test) & !prod & !production");
    /** En dev/test solo se aceptan llaves de prueba de ONVO. */
    static final String PREFIJO_LLAVE_TEST = "onvo_test_";

    @Value("${onvo.secret-key:}")
    private String secretKey;

    /** Opt-in (PAYMENTS_ONVO_PERMITIR_LLAVE_TEST): con llave de prueba fuera de dev/test no se aborta el arranque,
     * pero billing queda deshabilitado (toda llamada falla cerrada). Default false = abortar como siempre. */
    @Value("${payments.onvo.permitir-llave-test:false}")
    private boolean permitirLlaveTest;

    /** Price ONVO recurrente del plan Emprendedor (US$9/mes). Vacío = el cobro de Emprendedor no está disponible. */
    @Value("${onvo.price-id.emprendedor:}")
    private String priceIdEmprendedor;

    @Value("${onvo.price-id.pyme:}")
    private String priceIdPyme;

    @Value("${onvo.price-id.negocio-plus:}")
    private String priceIdNegocioPlus;

    private final RestTemplate restTemplate;
    private final Environment environment;

    /** Sin Environment no hay perfil de simulación: fail-closed. */
    public OnvoBillingClient(RestTemplate restTemplate) {
        this(restTemplate, null);
    }

    @Autowired
    public OnvoBillingClient(RestTemplate restTemplate, Environment environment) {
        this.restTemplate = restTemplate;
        this.environment = environment;
    }

    /** No hay llave configurada (en blanco). No implica que se pueda simular. */
    public boolean sinLlave() {
        return secretKey == null || secretKey.isBlank();
    }

    /**
     * Modo simulado efectivo: sin llave Y con perfil dev/test (sin perfil productivo). En prod sin llave es
     * false, así que ningún caller toma el camino mock; las operaciones fallan cerradas.
     */
    public boolean isMockMode() {
        return sinLlave() && perfilDeSimulacion();
    }

    static boolean esLlaveDePrueba(String llave) {
        return llave != null && llave.trim().startsWith(PREFIJO_LLAVE_TEST);
    }

    /** Al arrancar: una llave de prueba fuera de dev/test es un error de configuración (no se muestra la llave). */
    @jakarta.annotation.PostConstruct
    void validarLlaveAlArrancar() {
        if (esLlaveDePrueba(secretKey) && !perfilDeSimulacion()) {
            if (permitirLlaveTest) {
                log.warn("[ALERTA-PAGO] ONVO billing con llave de prueba fuera de dev/test por opt-in "
                    + "(payments.onvo.permitir-llave-test): suscripciones y facturación DESHABILITADAS (fail-closed)");
                return;
            }
            log.error("[ALERTA-PAGO] ONVO billing configurado con una llave de prueba fuera de dev/test; "
                + "arranque abortado hasta configurar la llave live");
            throw new IllegalStateException(
                "ONVO billing: llave de prueba (" + PREFIJO_LLAVE_TEST + ") fuera de dev/test; arranque abortado");
        }
    }

    /** Billing deshabilitado: llave de prueba fuera de dev/test (solo llega aquí con el opt-in activo). */
    public boolean isBillingDeshabilitado() {
        return esLlaveDePrueba(secretKey) && !perfilDeSimulacion();
    }

    boolean perfilDeSimulacion() {
        return environment != null
            && environment.acceptsProfiles(PERFIL_SIMULACION)
            && !perfilProductivo();
    }

    /** Rechaza prod/production sin importar mayúsculas (p. ej. "dev,PROD" o "Dev,Production"). */
    private boolean perfilProductivo() {
        String[] activos = environment.getActiveProfiles();
        if (activos == null) {
            return false;
        }
        for (String p : activos) {
            String n = p == null ? "" : p.trim().toLowerCase(java.util.Locale.ROOT);
            if (n.equals("prod") || n.equals("production")) {
                return true;
            }
        }
        return false;
    }

    /** Fail-closed: sin llave fuera de dev/test se lanza excepción en vez de inventar ids de ONVO. */
    private void exigirSimulacionPermitida(String operacion) {
        if (!perfilDeSimulacion()) {
            log.error("[ALERTA-PAGO] ONVO billing sin llave fuera de dev/test; operación {} rechazada", operacion);
            throw new IllegalStateException("ONVO no está configurado. No se procesó la suscripción.");
        }
    }

    /** En dev/test la llave tiene que ser de prueba (onvo_test_); nunca una llave live. */
    private void exigirLlaveValidaParaPerfil() {
        boolean simulacion = perfilDeSimulacion();
        boolean dePrueba = esLlaveDePrueba(secretKey);
        if (simulacion && !dePrueba) {
            throw new IllegalStateException("En dev/test la llave de ONVO tiene que ser de prueba (" + PREFIJO_LLAVE_TEST + ")");
        }
        if (!simulacion && dePrueba) {
            log.error("[ALERTA-PAGO] Llamada a ONVO billing rechazada: llave de prueba fuera de dev/test");
            throw new IllegalStateException("ONVO está configurado con una llave de prueba fuera de dev/test. No se procesó la suscripción.");
        }
    }

    public String getPriceIdForPlan(String planNombre) {
        if (planNombre == null) return null;
        return switch (planNombre.toUpperCase(Locale.ROOT)) {
            case "EMPRENDEDOR" -> blankToNull(priceIdEmprendedor);
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
        if (sinLlave()) {
            exigirSimulacionPermitida("crearCustomer");
            return new OnvoCustomer("cus_mock_" + System.currentTimeMillis());
        }
        Map<String, Object> body = new HashMap<>();
        body.put("email", email);
        body.put("name", nombre);
        // ONVO POST /customers rechaza "metadata" (400 "property metadata should not exist"; spike QA 2026-10-23).
        // El parámetro se conserva por compatibilidad de firma, pero no se envía.
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
        if (sinLlave()) {
            exigirSimulacionPermitida("crearSuscripcion");
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

    /**
     * Igual que {@link #crearSuscripcionIncompleta(String, String, Map)} pero con período de prueba:
     * ONVO crea la suscripción en {@code trialing} (verificado en modo TEST, sin tarjeta con allow_incomplete),
     * no cobra durante {@code trialPeriodDays} y al terminar cobra el price cada mes. {@code trialDias <= 0}
     * equivale a la versión sin trial.
     */
    @CircuitBreaker(name = "onvo", fallbackMethod = "crearSuscripcionTrialFallback")
    @Retry(name = "onvo")
    public OnvoSubscription crearSuscripcionIncompleta(String customerId, String priceId,
                                                       Map<String, String> metadata, int trialDias) {
        if (sinLlave()) {
            exigirSimulacionPermitida("crearSuscripcion");
            return new OnvoSubscription("sub_mock_" + System.currentTimeMillis(), "item_mock");
        }
        Map<String, Object> body = new HashMap<>();
        body.put("customerId", customerId);
        body.put("paymentBehavior", "allow_incomplete");
        body.put("items", List.of(Map.of("priceId", priceId, "quantity", 1)));
        if (trialDias > 0) {
            body.put("trialPeriodDays", trialDias);
        }
        if (metadata != null && !metadata.isEmpty()) {
            body.put("metadata", metadata);
        }
        Map<?, ?> resp = post("/subscriptions", body);
        return new OnvoSubscription(requireId(resp, "subscription"), extraerPrimerItemId(resp));
    }

    @CircuitBreaker(name = "onvo", fallbackMethod = "cambiarPrecioFallback")
    @Retry(name = "onvo")
    public void cambiarPrecioSuscripcion(String subscriptionId, String itemId, String nuevoPriceId) {
        if (sinLlave()) {
            exigirSimulacionPermitida("cambiarPrecio");
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
    public ResultadoCancelacion cancelarAlVencer(String subscriptionId) {
        boolean idMock = subscriptionId != null && subscriptionId.startsWith("sub_mock");
        // Fail-closed: un id simulado fuera de dev/test nunca se da por cancelado.
        if (sinLlave() || idMock) exigirSimulacionPermitida("cancelarAlVencer");
        if (sinLlave() || subscriptionId == null || idMock) {
            log.info("[onvo-mock] cancelarAlVencer({})", subscriptionId);
            return ResultadoCancelacion.PROGRAMADA;
        }
        // ONVO: "Actualizar un Cargo recurrente" = POST /v1/subscriptions/{id} con cancelAtPeriodEnd
        // (https://docs.onvopay.com/api/actualizar-un-cargo-recurrente, schema UpdateSubscription).
        // No existe /subscriptions/{id}/cancel (404) y DELETE cancela de inmediato.
        Map<String, Object> body = Map.of("cancelAtPeriodEnd", true);
        Map<?, ?> resp = post("/subscriptions/" + subscriptionId, body);
        // Fail-closed: sin confirmación explícita de ONVO no se da por programada la cancelación.
        // L210: status "canceled" = ONVO ya la canceló de inmediato; el llamador debe reflejarlo localmente.
        if ("canceled".equals(resp.get("status"))) {
            log.error("[ALERTA-PAGO] ONVO reportó la suscripción como canceled al pedir cancelAtPeriodEnd: sub={}",
                subscriptionId);
            return ResultadoCancelacion.CANCELADA;
        }
        if (!Boolean.TRUE.equals(resp.get("cancelAtPeriodEnd"))) {
            log.error("[ALERTA-PAGO] ONVO no confirmó cancelAtPeriodEnd: sub={}", subscriptionId);
            throw new IllegalStateException("ONVO no confirmó la cancelación al final del período");
        }
        log.info("[onvo] Suscripción marcada cancelAtPeriodEnd: {}", subscriptionId);
        return ResultadoCancelacion.PROGRAMADA;
    }

    /** «live» o «test» según la llave de billing. Sin llave (o billing deshabilitado) no hay modo: null. */
    public String modoEsperado() {
        if (sinLlave() || isBillingDeshabilitado()) return null;
        return esLlaveDePrueba(secretKey) ? "test" : "live";
    }

    /** Inverso de getPriceIdForPlan: el plan sale del priceId que confirma ONVO, nunca de metadata. */
    public String planParaPriceId(String priceId) {
        if (priceId == null || priceId.isBlank()) return null;
        if (priceId.equals(blankToNull(priceIdEmprendedor))) return "EMPRENDEDOR";
        if (priceId.equals(blankToNull(priceIdPyme))) return "PYME";
        if (priceId.equals(blankToNull(priceIdNegocioPlus))) return "NEGOCIO_PLUS";
        return null;
    }

    /** true si falta alguno de los price ids de planes (ONVO_PRICE_ID_*): sin ellos no se puede clasificar un price. */
    public boolean faltanPriceIds() {
        return blankToNull(priceIdPyme) == null || blankToNull(priceIdNegocioPlus) == null;
    }

    /** GET /v1/subscriptions/{id}. Fail-closed: sin llave real no se inventa nada. */
    public Map<?, ?> obtenerSuscripcion(String subscriptionId) {
        return leerReal("/subscriptions/", subscriptionId);
    }

    /** GET /v1/invoices/{id} (renovación de ONVO). */
    public Map<?, ?> obtenerRenovacion(String invoiceId) {
        return leerReal("/invoices/", invoiceId);
    }

    /** GET /v1/prices/{id}: moneda y monto (unidad menor) que ONVO cobra por ese price. */
    public Map<?, ?> obtenerPrecio(String priceId) {
        return leerReal("/prices/", priceId);
    }

    /** GET /v1/payment-intents/{id}. */
    public Map<?, ?> obtenerPaymentIntent(String intentId) {
        return leerReal("/payment-intents/", intentId);
    }

    /** priceId del único item de la suscripción; null si no hay exactamente uno. */
    public static String primerPriceId(Map<?, ?> sub) {
        Object items = sub == null ? null : sub.get("items");
        if (items instanceof List<?> list && list.size() == 1 && list.get(0) instanceof Map<?, ?> item) {
            Object p = item.get("priceId");
            if (p == null && item.get("price") instanceof Map<?, ?> price) p = price.get("id");
            return p == null ? null : String.valueOf(p);
        }
        return null;
    }

    private static final java.util.regex.Pattern ID_ONVO = java.util.regex.Pattern.compile("^[A-Za-z0-9_-]{1,64}$");

    /** Forma válida de un id de ONVO; los ids vienen de webhooks (no confiables) y van dentro de la URL del GET. */
    public static boolean idValido(String id) {
        return id != null && ID_ONVO.matcher(id).matches();
    }

    private Map<?, ?> leerReal(String base, String id) {
        if (id == null || id.isBlank()) {
            throw new IllegalStateException("ONVO: id requerido para consultar " + base);
        }
        if (!idValido(id)) {
            throw new IllegalArgumentException("ONVO: id con formato inválido para consultar " + base);
        }
        if (sinLlave() || isBillingDeshabilitado()) {
            log.error("[ALERTA-PAGO] ONVO billing sin llave válida; no se puede verificar {}", base);
            throw new IllegalStateException("ONVO no está configurado. No se verificó el evento.");
        }
        return get(base + id);
    }

    /** Resultado confirmado por ONVO al pedir la cancelación al vencer. */
    public enum ResultadoCancelacion { PROGRAMADA, CANCELADA }

    @SuppressWarnings("unchecked")
    public String obtenerPrimerItemId(String subscriptionId) {
        if (sinLlave()) {
            exigirSimulacionPermitida("obtenerPrimerItemId");
            return "item_mock";
        }
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
        exigirLlaveValidaParaPerfil();
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
        log.error("[onvo-circuit] OPEN crearCustomer: {} status={}", t.getClass().getSimpleName(), statusDe(t));
        throw new IllegalStateException("Servicio de pagos no disponible temporalmente", t);
    }

    private OnvoSubscription crearSuscripcionFallback(String customerId, String priceId,
                                                      Map<String, String> metadata, Throwable t) {
        log.error("[onvo-circuit] OPEN crearSuscripcion: {} status={}", t.getClass().getSimpleName(), statusDe(t));
        throw new IllegalStateException("Servicio de pagos no disponible temporalmente", t);
    }

    private OnvoSubscription crearSuscripcionTrialFallback(String customerId, String priceId,
                                                           Map<String, String> metadata, int trialDias, Throwable t) {
        log.error("[onvo-circuit] OPEN crearSuscripcionTrial: {} status={}", t.getClass().getSimpleName(), statusDe(t));
        throw new IllegalStateException("Servicio de pagos no disponible temporalmente", t);
    }

    private void cambiarPrecioFallback(String subscriptionId, String itemId,
                                       String nuevoPriceId, Throwable t) {
        log.error("[onvo-circuit] OPEN cambiarPrecio: {} status={}", t.getClass().getSimpleName(), statusDe(t));
        throw new IllegalStateException("Servicio de pagos no disponible temporalmente", t);
    }

    private ResultadoCancelacion cancelarFallback(String subscriptionId, Throwable t) {
        log.error("[onvo-circuit] OPEN cancelar: {} status={}", t.getClass().getSimpleName(), statusDe(t));
        throw new IllegalStateException("Servicio de pagos no disponible temporalmente", t);
    }

    /** Para logs de fallback: status HTTP si lo hay, nunca el mensaje (puede traer cuerpo de ONVO o datos). */
    static String statusDe(Throwable t) {
        if (t instanceof org.springframework.web.client.RestClientResponseException r) {
            return String.valueOf(r.getStatusCode().value());
        }
        return "n/a";
    }
}
