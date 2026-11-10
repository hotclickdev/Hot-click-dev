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
     *
     * <p>SIN {@code @Retry} a propósito: ONVO no documenta una llave de idempotencia para {@code POST /subscriptions}, así
     * que reintentar tras un timeout (la suscripción pudo haberse creado) fabrica una segunda suscripción huérfana que
     * cobraría al terminar el trial. Un fallo transitorio sube al llamador, que lo reintenta bajo el lock del negocio
     * (ver {@code SuscripcionOnvoChangeService}); el único alta por negocio lo garantiza ese lock.
     */
    @CircuitBreaker(name = "onvo", fallbackMethod = "crearSuscripcionFallback")
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

    /**
     * Cancela de inmediato una suscripción que NO debía existir (alta duplicada u huérfana): {@code DELETE
     * /v1/subscriptions/{id}} (cancela ya, sin esperar al fin del período). Solo para reconciliar; el id tiene que
     * tener forma válida y en dev/test sin llave un id simulado no llama a ONVO. Idempotente, por eso sí lleva {@code @Retry}.
     */
    @Retry(name = "onvo")
    public void cancelarInmediato(String subscriptionId) {
        boolean idMock = subscriptionId != null && subscriptionId.startsWith("sub_mock");
        if (sinLlave() || idMock) exigirSimulacionPermitida("cancelarInmediato");
        if (sinLlave() || idMock) {
            log.info("[onvo-mock] cancelarInmediato({})", subscriptionId);
            return;
        }
        if (!idValido(subscriptionId)) {
            throw new IllegalArgumentException("Id de suscripción ONVO inválido");
        }
        delete("/subscriptions/" + subscriptionId);
        log.warn("[onvo] Suscripción cancelada de inmediato (reconciliación) sub={}", subscriptionId);
    }

    /*
     * ALTO-02b: no hay cambio de precio sobre una suscripción ONVO. "Actualizar item de un Cargo recurrente"
     * (PATCH /v1/subscriptions/:id/items/:item, https://docs.onvopay.com/api/actualizar-item-de-un-cargo-recurrente)
     * edita items ADICIONALES (description, amount, quantity, currency) y rechaza priceId con 400 "property priceId
     * should not exist". "Actualizar un Cargo recurrente" (POST /v1/subscriptions/:id) tampoco acepta items ni priceId.
     * El priceId solo se manda al crear: items[].priceId en POST /v1/subscriptions. Ver SuscripcionOnvoChangeService.
     */

    /** {@code status} de la suscripción ONVO (active, trialing, incomplete, incomplete_expired, past_due...), o null. */
    public static String estadoDe(Map<?, ?> sub) {
        Object v = sub == null ? null : sub.get("status");
        return v instanceof String t && !t.isBlank() ? t : null;
    }

    /** {@code true} si la suscripción tiene método de pago asociado ({@code paymentMethodId}). */
    public static boolean tieneMetodoPago(Map<?, ?> sub) {
        Object v = sub == null ? null : sub.get("paymentMethodId");
        return v instanceof String t && !t.isBlank();
    }

    /** Sin {@code @Retry}: es un POST; con respuesta ambigua no se repite a ciegas (MEDIO Seguridad, Opción A). */
    @CircuitBreaker(name = "onvo", fallbackMethod = "cancelarFallback")
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

    /**
     * MEDIO Seguridad (Opción A): cancelación pedida por el negocio ({@code /api/billing/cancelar}). Se cancela en ONVO
     * ANTES de tocar nada local y solo se devuelve un resultado con confirmación explícita de ONVO:
     * <ul>
     *   <li>{@code inmediata=true}: {@code DELETE /v1/subscriptions/{id}} (responde el objeto Subscription);</li>
     *   <li>{@code inmediata=false}: {@code POST /v1/subscriptions/{id}} con {@code cancelAtPeriodEnd=true}.</li>
     * </ul>
     * SIN {@code @Retry} a propósito: una escritura con respuesta ambigua no se repite a ciegas. Si la escritura falla o
     * la respuesta no confirma, se relee la suscripción con un GET (solo lectura); si tampoco confirma, lanza y el
     * llamador responde 503 sin cambios locales. No se manda Idempotency-Key. En dev/test sin llave (o id simulado) se
     * comporta igual que {@link #cancelarInmediato}/{@link #cancelarAlVencer} (simulación solo con perfil permitido).
     */
    public ResultadoCancelacion cancelarPorNegocio(String subscriptionId, boolean inmediata) {
        boolean idMock = subscriptionId != null && subscriptionId.startsWith("sub_mock");
        if (sinLlave() || idMock) {
            exigirSimulacionPermitida("cancelarPorNegocio");
            log.info("[onvo-mock] cancelarPorNegocio(inmediata={})", inmediata);
            return inmediata ? ResultadoCancelacion.CANCELADA : ResultadoCancelacion.PROGRAMADA;
        }
        if (!idValido(subscriptionId)) {
            throw new IllegalArgumentException("Id de suscripción ONVO inválido");
        }
        String path = "/subscriptions/" + subscriptionId;
        Map<?, ?> resp = null;
        try {
            resp = inmediata ? deleteConRespuesta(path) : post(path, Map.of("cancelAtPeriodEnd", true));
        } catch (RuntimeException e) {
            log.warn("[onvo] cancelación del negocio sin respuesta clara sub={} inmediata={} causa={} status={};"
                    + " se verifica por GET", enmascararId(subscriptionId), inmediata, e.getClass().getSimpleName(),
                statusDe(e));
        }
        ResultadoCancelacion r = cancelacionConfirmada(resp, subscriptionId, inmediata);
        if (r != null) {
            log.info("[onvo] cancelación del negocio confirmada sub={} resultado={}", enmascararId(subscriptionId), r);
            return r;
        }
        // Respuesta ambigua o error: se relee (lectura), nunca se repite la escritura. Si el GET falla, sube la excepción.
        r = cancelacionConfirmada(get(path), subscriptionId, inmediata);
        if (r == null) {
            log.error("[ALERTA-PAGO] ONVO no confirmó la cancelación pedida por el negocio sub={} inmediata={}",
                enmascararId(subscriptionId), inmediata);
            throw new IllegalStateException("ONVO no confirmó la cancelación");
        }
        log.info("[onvo] cancelación del negocio confirmada por GET sub={} resultado={}", enmascararId(subscriptionId), r);
        return r;
    }

    /**
     * Confirmación explícita de ONVO sobre ESA suscripción (el {@code id} es obligatorio y tiene que coincidir): {@code canceled} (o {@code incomplete_expired}, que ONVO ya
     * no cobra) = CANCELADA; con {@code inmediata=false}, {@code cancelAtPeriodEnd=true} = PROGRAMADA. Cualquier otra
     * cosa (sin cuerpo, otro id, otro estado) = null (ambigua).
     */
    static ResultadoCancelacion cancelacionConfirmada(Map<?, ?> sub, String subscriptionId, boolean inmediata) {
        if (sub == null || sub.isEmpty()) return null;
        Object id = sub.get("id");
        // Sin id o con otro id no es confirmación de ESTA suscripción.
        if (id == null || subscriptionId == null || !String.valueOf(id).equals(subscriptionId)) return null;
        Object status = sub.get("status");
        if ("canceled".equals(status) || "incomplete_expired".equals(status)) return ResultadoCancelacion.CANCELADA;
        if (!inmediata && Boolean.TRUE.equals(sub.get("cancelAtPeriodEnd"))) return ResultadoCancelacion.PROGRAMADA;
        return null;
    }

    /** Id enmascarado para logs: solo los últimos 4 caracteres. */
    private static String enmascararId(String id) {
        if (id == null || id.length() <= 4) return "****";
        return "****" + id.substring(id.length() - 4);
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
        return blankToNull(priceIdEmprendedor) == null
            || blankToNull(priceIdPyme) == null || blankToNull(priceIdNegocioPlus) == null;
    }

    /** GET /v1/subscriptions/{id}. Fail-closed: sin llave real no se inventa nada. */
    public Map<?, ?> obtenerSuscripcion(String subscriptionId) {
        return leerReal("/subscriptions/", subscriptionId);
    }

    /** GET /v1/invoices/{id} (renovación de ONVO). */
    public Map<?, ?> obtenerRenovacion(String invoiceId) {
        return leerReal("/invoices/", invoiceId);
    }

    /**
     * MEDIO-1: {@code GET /v1/invoices?subscriptionId=…&limit=100} ("Listar renovaciones",
     * https://docs.onvopay.com/api/listar-renovaciones). Respuesta {@code InvoiceList}: {@code data[]} + {@code meta}.
     * Fail-closed igual que los GET por id: sin llave real o id inválido, lanza.
     */
    public List<Map<?, ?>> listarFacturasDeSuscripcion(String subscriptionId) {
        Map<?, ?> resp = leerReal("/invoices?limit=100&subscriptionId=", subscriptionId);
        Object data = resp.get("data");
        List<Map<?, ?>> out = new java.util.ArrayList<>();
        if (data instanceof List<?> l) {
            for (Object o : l) if (o instanceof Map<?, ?> m) out.add(m);
        }
        return out;
    }

    /**
     * MEDIO-1: factura del período ACTUAL de la suscripción. {@code latestInvoiceId} puede apuntar a la factura
     * {@code open} del período siguiente (ONVO la crea por adelantado), así que se filtra por
     * {@code subscriptionId} y {@code periodStart == currentPeriodStart}. Si hay varias del mismo período gana la
     * {@code paid}. Sin coincidencia: null (quien llama no activa ni cobra a ciegas).
     */
    public static Map<?, ?> facturaDelPeriodoActual(List<Map<?, ?>> facturas, Map<?, ?> sub) {
        if (facturas == null || sub == null) return null;
        Object subId = sub.get("id");
        Object inicio = sub.get("currentPeriodStart");
        if (subId == null || inicio == null) return null;
        Map<?, ?> elegida = null;
        for (Map<?, ?> f : facturas) {
            if (!String.valueOf(subId).equals(String.valueOf(f.get("subscriptionId")))) continue;
            if (!mismoInstante(inicio, f.get("periodStart"))) continue;
            if ("paid".equalsIgnoreCase(String.valueOf(f.get("status")))) return f;
            if (elegida == null) elegida = f;
        }
        return elegida;
    }

    /**
     * MEDIO-1: factura del período actual releída por {@code GET /v1/invoices/{id}} (trae el paymentIntent embebido
     * que usa el verificador). Mapa vacío si ONVO no tiene factura de ese período.
     */
    public Map<?, ?> obtenerFacturaDelPeriodoActual(Map<?, ?> sub) {
        Object subId = sub == null ? null : sub.get("id");
        if (subId == null) return Map.of();
        Map<?, ?> f = facturaDelPeriodoActual(listarFacturasDeSuscripcion(String.valueOf(subId)), sub);
        Object id = f == null ? null : f.get("id");
        return id == null ? Map.of() : obtenerRenovacion(String.valueOf(id));
    }

    private static boolean mismoInstante(Object a, Object b) {
        if (a == null || b == null) return false;
        try {
            return java.time.Instant.parse(String.valueOf(a)).equals(java.time.Instant.parse(String.valueOf(b)));
        } catch (java.time.format.DateTimeParseException e) {
            return String.valueOf(a).equals(String.valueOf(b));
        }
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

    private void delete(String path) {
        restTemplate.exchange(
            API_BASE + path, HttpMethod.DELETE, new HttpEntity<>(authHeaders()), Map.class);
    }

    private Map<?, ?> deleteConRespuesta(String path) {
        ResponseEntity<Map> resp = restTemplate.exchange(
            API_BASE + path, HttpMethod.DELETE, new HttpEntity<>(authHeaders()), Map.class);
        return resp == null || resp.getBody() == null ? Map.of() : resp.getBody();
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


    private ResultadoCancelacion cancelarFallback(String subscriptionId, Throwable t) {
        log.error("[onvo-circuit] OPEN cancelar: {} status={}", t.getClass().getSimpleName(), statusDe(t));
        throw new IllegalStateException("Servicio de pagos no disponible temporalmente", t);
    }

    /** Para logs de fallback: status HTTP si lo hay, nunca el mensaje (puede traer cuerpo de ONVO o datos). */
    public static String statusDe(Throwable t) {
        if (t instanceof org.springframework.web.client.RestClientResponseException r) {
            return String.valueOf(r.getStatusCode().value());
        }
        return "n/a";
    }
}
