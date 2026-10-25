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
import java.util.Locale;
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
    private static final String PREFIJO_LLAVE_PRUEBA = "onvo_test_";

    @Value("${onvo.secret-key:}")
    private String secretKey;

    @Value("${onvo.webhook-secret:}")
    private String webhookSecret;

    /** Opt-in explícito (PAYMENTS_ONVO_PERMITIR_LLAVE_TEST): acepta llave onvo_test_ fuera de dev/test. Nunca activa el mock. */
    @Value("${payments.onvo.permitir-llave-test:false}")
    private boolean permitirLlaveTest = false;

    @Value("${onvo.publishable-key:}")
    private String publishableKey;

    /** Número destino SINPE Móvil que asigna ONVO (ONVO_SINPE_DESTINO). Sin valor por defecto: vacío = SINPE manual no disponible. */
    @Value("${onvo.sinpe-destino:}")
    private String sinpeDestino;

    private static final Pattern TELEFONO_SINPE = Pattern.compile("\\+?[0-9]{8,15}");

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
        boolean simulacion = perfilDeSimulacion();
        mockMode = !credenciales && simulacion;
        pagosDisponibles = credenciales || mockMode;
        if (mockMode) {
            log.warn("[onvo] Sin ONVO_SECRET_KEY en perfil dev/test — modo simulado. No cobra tarjetas reales.");
            return;
        }
        if (!credenciales) {
            log.error("[ALERTA-PAGO] ONVO sin ONVO_SECRET_KEY fuera de dev/test. Pagos con tarjeta deshabilitados.");
            return;
        }
        if (esLlaveDePrueba() && !simulacion && permitirLlaveTest) {
            log.warn("[ALERTA-PAGO] ONVO en MODO PRUEBA en perfil no-dev por opt-in (payments.onvo.permitir-llave-test). No se cobra plata real.");
            return;
        }
        if (esLlaveDePrueba() && !simulacion) {
            // Con una llave de prueba, una tarjeta de prueba pública daría el pedido por pagado sin plata real.
            pagosDisponibles = false;
            log.error("[ALERTA-PAGO] ONVO con llave de prueba fuera de dev/test. Pagos con tarjeta deshabilitados.");
            return;
        }
        log.info("[onvo] Cliente inicializado (live={})", !esLlaveDePrueba());
    }

    private boolean esLlaveDePrueba() {
        return secretKey != null && secretKey.startsWith(PREFIJO_LLAVE_PRUEBA);
    }

    /** Modo («test» o «live») que tienen que traer la sesión y el intent de ONVO según la llave configurada. */
    public String modoEsperado() {
        return esLlaveDePrueba() ? "test" : "live";
    }

    private boolean perfilDeSimulacion() {
        return environment != null
            && !perfilProduccionActivo()
            && environment.acceptsProfiles(Profiles.of("(dev | test) & !prod & !production"));
    }

    /** prod/production activos en cualquier capitalización (PROD, Production…): nunca se simula. */
    private boolean perfilProduccionActivo() {
        for (String p : environment.getActiveProfiles()) {
            String n = p == null ? "" : p.trim().toLowerCase(Locale.ROOT);
            if (n.equals("prod") || n.equals("production")) return true;
        }
        return false;
    }

    /** Sin llave fuera de dev/test: falla antes de tocar ONVO o de inventar un id. */
    private void exigirPagosDisponibles() {
        if (!pagosDisponibles) {
            throw new IllegalStateException("ONVO no está configurado. No se procesó el pago.");
        }
    }

    public boolean isPagosDisponibles() { return pagosDisponibles; }

    /**
     * Destino SINPE Móvil de ONVO desde la configuración (la API de ONVO no lo devuelve). Fail-closed: vacío
     * si falta o no tiene forma de teléfono; quien lo use debe tratar el vacío como «SINPE no disponible».
     */
    public String sinpeDestino() {
        if (sinpeDestino == null) return "";
        String limpio = sinpeDestino.replaceAll("[\\s-]", "");
        return TELEFONO_SINPE.matcher(limpio).matches() ? limpio : "";
    }

    /** Solo para tests. */
    void setSinpeDestinoParaTest(String valor) { this.sinpeDestino = valor; }

    /**
     * SINPERefNumber (25 caracteres) de la transferencia SINPE ligada al payment intent, leído de
     * GET /v1/mobile-transfers/list (la API no filtra por intent: se filtra aquí). null si no hay, si no hay
     * llave o si la cuenta no tiene habilitada la consulta (ONVO responde 400 sin número personalizado).
     * Nunca lanza: es un dato informativo que no decide ningún cobro.
     */
    public String sinpeRefNumberDe(String intentId) {
        if (!consultable(intentId)) return null;
        try {
            Map<?, ?> body = getOnvo("/mobile-transfers/list?status=received&limit=100");
            return sinpeRefDeLista(body, intentId);
        } catch (RuntimeException e) {
            log.info("[onvo] SINPERefNumber no disponible para intent {}: {}", intentId, e.getClass().getSimpleName());
            return null;
        }
    }

    static String sinpeRefDeLista(Map<?, ?> body, String intentId) {
        if (body == null || !(body.get("data") instanceof java.util.List<?> lista)) return null;
        for (Object o : lista) {
            if (o instanceof Map<?, ?> t && intentId.equals(String.valueOf(t.get("paymentIntentId")))) {
                Object ref = t.get("SINPERefNumber");
                String r = ref == null ? "" : String.valueOf(ref).trim();
                return r.isEmpty() || r.length() > 25 ? null : r;
            }
        }
        return null;
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
    /**
     * Igual que {@link #crearCheckoutSession(int, String, String, String, String, Map)} pero a nombre
     * de una cuenta conectada (campo {@code onBehalfOf} de CreateOneTimeLink). Quien llama solo pasa
     * el id si la cuenta está ACTIVA. No toca split pay ni comisiones.
     */
    @CircuitBreaker(name = "onvo", fallbackMethod = "crearCheckoutSessionOnBehalfFallback")
    @Retry(name = "onvo")
    public OnvoCheckoutSession crearCheckoutSession(int totalColones, String descripcion,
                                                    String successUrl, String cancelUrl,
                                                    String customerEmail, Map<String, String> metadata,
                                                    String onBehalfOf) {
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
        if (onBehalfOf != null && ID_ONVO.matcher(onBehalfOf).matches()) {
            body.put("onBehalfOf", onBehalfOf);
        }
        try {
            return parseCheckout(postOnvo("/checkout/sessions/one-time-link", body));
        } catch (HttpClientErrorException e) {
            throw new IllegalStateException(OnvoErrorSupport.mensajeCliente(e));
        }
    }

    @SuppressWarnings("unused")
    private OnvoCheckoutSession crearCheckoutSessionOnBehalfFallback(int totalColones, String descripcion,
                                                                     String successUrl, String cancelUrl,
                                                                     String customerEmail, Map<String, String> metadata,
                                                                     String onBehalfOf, Throwable t) {
        throw relanzarFalloOnvo("crearCheckoutSession", t);
    }

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

    /** Tipos de identificación que acepta ONVO para mobile_number: 1 física, 2 jurídica, 3 DIMEX, 4 NITE. */
    public static boolean tipoIdentificacionValido(Integer tipo) {
        return tipo != null && tipo >= 1 && tipo <= 4;
    }

    private static final Pattern IDENTIFICACION_SINPE = Pattern.compile("[0-9A-Za-z]+(-[0-9A-Za-z]+)+");

    /** ONVO exige la identificación con guiones y al menos 12 caracteres (openapi mobileNumber.identification). */
    public static boolean identificacionSinpeValida(String identificacion) {
        if (identificacion == null) return false;
        String v = identificacion.trim();
        return v.length() >= 12 && v.length() <= 30 && IDENTIFICACION_SINPE.matcher(v).matches();
    }

    /**
     * Método mobile_number para un cobro presencial (POS): identificación y tipo del pagador, que ONVO
     * compara con la transferencia entrante junto con el monto. Sin número del pagador ni correo.
     */
    @CircuitBreaker(name = "onvo", fallbackMethod = "crearMetodoPagoSinpePosFallback")
    public OnvoPaymentMethod crearMetodoPagoSinpePos(String identificacion, int tipoIdentificacion, String nombre) {
        if (!identificacionSinpeValida(identificacion) || !tipoIdentificacionValido(tipoIdentificacion)) {
            throw new IllegalArgumentException("Identificación inválida para SINPE Móvil");
        }
        if (mockMode) {
            return new OnvoPaymentMethod("onvo_pm_mock_" + System.currentTimeMillis());
        }
        exigirPagosDisponibles();
        Map<String, Object> mobile = new HashMap<>();
        mobile.put("identification", identificacion.trim());
        mobile.put("identificationType", tipoIdentificacion);
        Map<String, Object> billing = new HashMap<>();
        billing.put("name", nombre == null || nombre.isBlank() ? "Cliente" : nombre.trim());
        Map<String, Object> body = new HashMap<>();
        body.put("type", "mobile_number");
        body.put("mobileNumber", mobile);
        body.put("billing", billing);
        try {
            return parsePaymentMethod(postOnvo("/payment-methods", body));
        } catch (HttpClientErrorException e) {
            throw new IllegalStateException(OnvoErrorSupport.mensajeCliente(e));
        }
    }

    /**
     * Cancela el payment intent (POST /v1/payment-intents/{id}/cancel). Un intent SINPE no vence solo en ONVO:
     * el POS lo cancela al cumplirse su propio timeout. Devuelve el status que responde ONVO
     * ("" si no se pudo: sin llave, id inválido o error); quien llama solo da por cancelado con "canceled".
     */
    public String cancelarPaymentIntent(String intentId) {
        if (!consultable(intentId)) return "";
        try {
            Map<?, ?> body = postOnvo("/payment-intents/" + intentId + "/cancel", Map.of());
            return body == null || body.get("status") == null ? "" : String.valueOf(body.get("status"));
        } catch (RuntimeException e) {
            log.warn("[onvo] No se pudo cancelar el payment intent {}: {}", intentId, e.getMessage());
            return "";
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

    /**
     * Solo un 404 significa «ONVO no la tiene» y da vacío. 401/403/429 (llave revocada o mal rotada,
     * límite de tasa) y 5xx o red se relanzan: no se sabe si hubo cobro, así que nadie cancela por eso.
     */
    private Map<?, ?> leer(String ruta, String id) {
        if (!consultable(id)) return Map.of();
        try {
            Map<?, ?> body = getOnvo(ruta + id);
            return body == null ? Map.of() : body;
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("[onvo] ONVO no tiene {}{}", ruta, id);
            return Map.of();
        }
    }

    /**
     * Expira la checkout session en ONVO (POST /v1/checkout/sessions/{id}/expire) para que ya no se pueda
     * pagar. Devuelve la sesión que responde ONVO; vacío si ONVO no la tiene (404) o no hay llave.
     * Cualquier otro error se relanza: sin confirmar que expiró no se cancela el pedido.
     */
    @CircuitBreaker(name = "onvo", fallbackMethod = "lecturaFallback")
    public Map<?, ?> expirarCheckoutSession(String sessionId) {
        if (!consultable(sessionId)) return Map.of();
        try {
            Map<?, ?> body = postOnvo("/checkout/sessions/" + sessionId + "/expire", Map.of());
            return body == null ? Map.of() : body;
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("[onvo] ONVO no tiene la sesión {} para expirar", sessionId);
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

    private OnvoPaymentMethod crearMetodoPagoSinpePosFallback(String identificacion, int tipo, String nombre, Throwable t) {
        throw relanzarFalloOnvo("crearMetodoPagoSinpePos", t);
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
