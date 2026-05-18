package com.hotclick.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.config.PayPalConfig;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.BccrService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Proveedor PayPal — utiliza PayPal Orders API v2.
 *
 * Notas de moneda:
 *   PayPal no acepta CRC directamente. Se convierte a USD usando el TC del BCCR.
 *   El campo Pago.monto siempre almacena el valor original en CRC.
 */
@Component
public class PayPalPaymentProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(PayPalPaymentProvider.class);

    @Autowired private PayPalConfig                  config;
    @Autowired private BccrService                   bccrService;
    @Autowired private PagoRepository                pagoRepository;
    @Autowired private TransaccionPagoRepository     transaccionPagoRepository;
    @Autowired private WebhookEventRepository        webhookEventRepository;
    @Autowired private PaymentLogRepository          paymentLogRepository;
    @Autowired private ObjectMapper                  objectMapper;

    @Lazy
    @Autowired private com.hotclick.service.PaymentService paymentService;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    // Cache del access token OAuth (evitar un round-trip por request)
    private volatile String cachedToken;
    private volatile long   tokenExpiryMs = 0;

    @Override
    public String getNombre() {
        return "PAYPAL";
    }

    @Override
    public PaymentSession crearSesion(Pedido pedido, Usuario usuario) throws Exception {
        String accessToken = getAccessToken();

        // Convertir CRC → USD (PayPal no acepta CRC)
        int    tc        = bccrService.getTipoCambioVenta();
        double amountUsd = Math.ceil((double) pedido.getTotalPedido() / tc * 100.0) / 100.0;
        String amountStr = String.format("%.2f", amountUsd);

        Map<String, Object> body = new HashMap<>();
        body.put("intent", "CAPTURE");
        body.put("purchase_units", List.of(Map.of(
            "reference_id", pedido.getNumeroPedido(),
            "description",  "Pedido HOTCLICK " + pedido.getNumeroPedido(),
            "amount",        Map.of("currency_code", "USD", "value", amountStr)
        )));
        body.put("payment_source", Map.of(
            "paypal", Map.of(
                "experience_context", Map.of(
                    "payment_method_preference", "IMMEDIATE_PAYMENT_REQUIRED",
                    "brand_name",         "HOTCLICK",
                    "locale",             "es-CR",
                    "landing_page",       "LOGIN",
                    "shipping_preference","NO_SHIPPING",
                    "user_action",        "PAY_NOW",
                    "return_url", config.getReturnUrl() + "?order=" + pedido.getNumeroPedido() + "&provider=paypal",
                    "cancel_url", config.getCancelUrl() + "?order=" + pedido.getNumeroPedido() + "&provider=paypal"
                )
            )
        ));

        long inicio = System.currentTimeMillis();
        Map<String, Object> response = callPayPal("POST", "/v2/checkout/orders", body, accessToken);
        guardarLog("CREATE_ORDER_PAYPAL", "/v2/checkout/orders", body, 201,
            response, (int)(System.currentTimeMillis() - inicio), usuario, true);

        String orderId = (String) response.get("id");
        if (orderId == null) {
            throw new RuntimeException("PayPal no devolvió un order ID válido");
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> links = (List<Map<String, Object>>) response.get("links");
        String approveUrl = links == null ? null : links.stream()
            .filter(l -> "approve".equals(l.get("rel")))
            .findFirst()
            .map(l -> (String) l.get("href"))
            .orElse(null);

        if (approveUrl == null) {
            throw new RuntimeException("PayPal no devolvió URL de aprobación");
        }

        log.info("PayPal order creado: orderId={} amountUsd={} numeroPedido={}",
            orderId, amountStr, pedido.getNumeroPedido());

        return new PaymentSession(orderId, approveUrl);
    }

    // ================================================================
    // Captura — llamado desde PaymentController tras el redirect de PayPal
    // ================================================================
    @Transactional
    public void capturar(String paypalOrderId, Pago pago) throws Exception {
        String accessToken = getAccessToken();

        long inicio = System.currentTimeMillis();
        Map<String, Object> response = callPayPal(
            "POST", "/v2/checkout/orders/" + paypalOrderId + "/capture", null, accessToken);
        int duracion = (int)(System.currentTimeMillis() - inicio);

        String status = (String) response.get("status");
        boolean exitoso = "COMPLETED".equals(status);

        guardarLog("CAPTURE_ORDER_PAYPAL",
            "/v2/checkout/orders/" + paypalOrderId + "/capture",
            null, exitoso ? 201 : 422, response, duracion, pago.getUsuario(), exitoso);

        if (!exitoso) {
            pago.setEstadoPago(Constants.PAGO_FALLIDO);
            pago.setFechaActualizacion(LocalDateTime.now());
            pagoRepository.save(pago);
            throw new RuntimeException("Captura PayPal no completada. Estado: " + status);
        }

        // Extraer capture ID
        String captureId = extractCaptureId(response);

        // Registrar transacción
        TransaccionPago txn = new TransaccionPago();
        txn.setPayxpertTxnId(captureId); // reusando campo como "external txn id"
        txn.setErrorCode("000");
        txn.setTipoOperacion("COBRO_PAYPAL");
        txn.setMontoOperacion(pago.getMonto());
        txn.setPayloadRespuesta(toJson(response));
        txn.setFechaTransaccion(LocalDateTime.now());
        txn.setPago(pago);
        txn.setEstado(Constants.ESTADO_ACTIVO);
        transaccionPagoRepository.save(txn);

        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setMetodoPagoTipo("PAYPAL");
        pago.setFechaActualizacion(LocalDateTime.now());
        pagoRepository.save(pago);

        paymentService.confirmarPedido(pago);

        log.info("PayPal capturado: orderId={} captureId={} pedido={}",
            paypalOrderId, captureId, pago.getPedido().getNumeroPedido());
    }

    // ================================================================
    // Webhook PayPal — PAYMENT.CAPTURE.COMPLETED (respaldo al capture directo)
    // ================================================================
    @Transactional
    public void procesarWebhook(String rawBody, HttpServletRequest request) throws Exception {
        // Verificar firma con la API de PayPal
        String verifyStatus = verificarFirma(rawBody, request);
        if (!"SUCCESS".equals(verifyStatus)) {
            throw new SecurityException("Firma de webhook PayPal inválida: " + verifyStatus);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> event = objectMapper.readValue(rawBody, Map.class);
        String eventType = (String) event.get("event_type");
        String eventId   = (String) event.get("id");

        if (eventId == null || eventType == null) return;

        // Idempotencia por eventId
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(eventId, eventType)) {
            log.info("Webhook PayPal duplicado ignorado: eventId={}", eventId);
            return;
        }

        WebhookEvent evento = new WebhookEvent();
        evento.setMerchantToken(eventId);
        evento.setEventoTipo(eventType);
        evento.setPayloadRaw(rawBody);
        evento.setIpOrigen(getIp(request));
        evento.setFechaRecepcion(LocalDateTime.now());
        evento.setEstado(Constants.ESTADO_ACTIVO);
        webhookEventRepository.save(evento);

        if ("PAYMENT.CAPTURE.COMPLETED".equals(eventType)) {
            procesarCapturaCompletada(event, evento);
        } else if ("PAYMENT.CAPTURE.DENIED".equals(eventType)) {
            procesarCapturaDenegada(event, evento);
        }

        evento.setProcesado(true);
        evento.setProcesadoEn(LocalDateTime.now());
        webhookEventRepository.save(evento);

        log.info("Webhook PayPal procesado: type={} eventId={}", eventType, eventId);
    }

    // ================================================================
    // Privados
    // ================================================================

    @SuppressWarnings("unchecked")
    private void procesarCapturaCompletada(Map<String, Object> event, WebhookEvent evento) {
        try {
            Map<String, Object> resource = (Map<String, Object>) event.get("resource");
            if (resource == null) return;

            // El orderId está en los links del resource (rel=up → .../orders/{orderId})
            String orderId = null;
            List<Map<String, Object>> links = (List<Map<String, Object>>) resource.get("links");
            if (links != null) {
                for (Map<String, Object> link : links) {
                    if ("up".equals(link.get("rel"))) {
                        String href = (String) link.get("href");
                        String[] parts = href.split("/");
                        orderId = parts[parts.length - 1];
                        break;
                    }
                }
            }

            if (orderId == null) {
                log.warn("Webhook PayPal CAPTURE.COMPLETED sin orderId en links");
                return;
            }

            Pago pago = pagoRepository.findByMerchantToken(orderId).orElse(null);
            if (pago == null) {
                log.warn("Webhook PayPal: no se encontró Pago para orderId={}", orderId);
                return;
            }

            // Si el pago ya fue capturado por el endpoint directo, solo loguear
            if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
                log.info("Webhook PayPal CAPTURE.COMPLETED ignorado — pago ya capturado: {}", orderId);
                return;
            }

            // Captura llegó por webhook (el usuario no volvió a nuestra página)
            String captureId = (String) resource.get("id");
            TransaccionPago txn = new TransaccionPago();
            txn.setPayxpertTxnId(captureId);
            txn.setErrorCode("000");
            txn.setTipoOperacion("COBRO_PAYPAL_WEBHOOK");
            txn.setMontoOperacion(pago.getMonto());
            txn.setPayloadRespuesta(toJson(resource));
            txn.setFechaTransaccion(LocalDateTime.now());
            txn.setPago(pago);
            txn.setEstado(Constants.ESTADO_ACTIVO);
            transaccionPagoRepository.save(txn);

            pago.setEstadoPago(Constants.PAGO_CAPTURADO);
            pago.setMetodoPagoTipo("PAYPAL");
            pago.setFechaActualizacion(LocalDateTime.now());
            pagoRepository.save(pago);

            paymentService.confirmarPedido(pago);

        } catch (Exception e) {
            log.error("Error procesando PAYMENT.CAPTURE.COMPLETED de PayPal: {}", e.getMessage(), e);
            evento.setErrorProcesamiento(e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private void procesarCapturaDenegada(Map<String, Object> event, WebhookEvent evento) {
        try {
            Map<String, Object> resource = (Map<String, Object>) event.get("resource");
            if (resource == null) return;

            String orderId = null;
            List<Map<String, Object>> links = (List<Map<String, Object>>) resource.get("links");
            if (links != null) {
                for (Map<String, Object> link : links) {
                    if ("up".equals(link.get("rel"))) {
                        String href = (String) link.get("href");
                        String[] parts = href.split("/");
                        orderId = parts[parts.length - 1];
                        break;
                    }
                }
            }

            if (orderId == null) {
                log.warn("Webhook PayPal CAPTURE.DENIED sin orderId en links");
                return;
            }

            Pago pago = pagoRepository.findByMerchantToken(orderId).orElse(null);
            if (pago == null) {
                log.warn("Webhook PayPal CAPTURE.DENIED: no se encontró Pago para orderId={}", orderId);
                return;
            }

            paymentService.marcarFallido(pago, "Pago denegado por PayPal");

        } catch (Exception e) {
            log.error("Error procesando PAYMENT.CAPTURE.DENIED de PayPal: {}", e.getMessage(), e);
            evento.setErrorProcesamiento(e.getMessage());
        }
    }

    private String verificarFirma(String rawBody, HttpServletRequest request) {
        try {
            String accessToken = getAccessToken();
            Map<String, Object> verifyBody = new HashMap<>();
            verifyBody.put("auth_algo",         request.getHeader("PAYPAL-AUTH-ALGO"));
            verifyBody.put("cert_url",          request.getHeader("PAYPAL-CERT-URL"));
            verifyBody.put("transmission_id",   request.getHeader("PAYPAL-TRANSMISSION-ID"));
            verifyBody.put("transmission_sig",  request.getHeader("PAYPAL-TRANSMISSION-SIG"));
            verifyBody.put("transmission_time", request.getHeader("PAYPAL-TRANSMISSION-TIME"));
            verifyBody.put("webhook_id",        config.getWebhookId());
            verifyBody.put("webhook_event",     objectMapper.readValue(rawBody, Map.class));

            Map<String, Object> result = callPayPal(
                "POST", "/v1/notifications/verify-webhook-signature", verifyBody, accessToken);
            return (String) result.get("verification_status");
        } catch (Exception e) {
            log.error("Error verificando firma PayPal: {}", e.getMessage());
            return "FAILURE";
        }
    }

    private synchronized String getAccessToken() throws Exception {
        if (cachedToken != null && System.currentTimeMillis() < tokenExpiryMs) {
            return cachedToken;
        }
        String clientId     = config.getClientId()     == null ? "" : config.getClientId().trim();
        String clientSecret = config.getClientSecret() == null ? "" : config.getClientSecret().trim();
        String apiUrl       = config.getApiUrl();

        log.info("PayPal OAuth → url={} clientId_len={} clientId_prefix={} secret_len={}",
            apiUrl, clientId.length(),
            clientId.length() > 8 ? clientId.substring(0, 8) : clientId,
            clientSecret.length());

        String credentials = clientId + ":" + clientSecret;
        String encoded = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(apiUrl + "/v1/oauth2/token"))
            .header("Authorization", "Basic " + encoded)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            log.error("PayPal OAuth falló status={} body={}", response.statusCode(), response.body());
            throw new RuntimeException("PayPal OAuth falló: " + response.body());
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> data = objectMapper.readValue(response.body(), Map.class);
        cachedToken    = (String) data.get("access_token");
        int expiresIn  = data.get("expires_in") != null ? (int) data.get("expires_in") : 3600;
        // Renovar 60 segundos antes de expirar
        tokenExpiryMs  = System.currentTimeMillis() + ((expiresIn - 60L) * 1000);

        return cachedToken;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callPayPal(String method, String path,
                                           Map<String, Object> body, String accessToken) throws Exception {
        String url = config.getApiUrl() + path;
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Authorization",              "Bearer " + accessToken)
            .header("Content-Type",               "application/json")
            .header("Accept",                     "application/json")
            .header("PayPal-Request-Id",          "hc-" + System.currentTimeMillis())
            .header("Prefer",                     "return=representation");

        String requestBody = body != null ? objectMapper.writeValueAsString(body) : "{}";

        if ("POST".equals(method)) {
            builder.POST(HttpRequest.BodyPublishers.ofString(requestBody));
        } else {
            builder.GET();
        }

        HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 400) {
            log.error("PayPal API error {}: {}", response.statusCode(), response.body());
            throw new RuntimeException("Error PayPal (" + response.statusCode() + "): " + response.body());
        }

        return objectMapper.readValue(response.body(), Map.class);
    }

    @SuppressWarnings("unchecked")
    private String extractCaptureId(Map<String, Object> captureResponse) {
        try {
            List<Map<String, Object>> units = (List<Map<String, Object>>) captureResponse.get("purchase_units");
            if (units == null || units.isEmpty()) return null;
            Map<String, Object> payments = (Map<String, Object>) units.get(0).get("payments");
            if (payments == null) return null;
            List<Map<String, Object>> captures = (List<Map<String, Object>>) payments.get("captures");
            if (captures == null || captures.isEmpty()) return null;
            return (String) captures.get(0).get("id");
        } catch (Exception e) {
            return null;
        }
    }

    private void guardarLog(String accion, String url, Object reqBody, int resCode,
                            Object resBody, int duracionMs, Usuario usuario, boolean exitoso) {
        try {
            PaymentLog log2 = new PaymentLog();
            log2.setAccion(accion);
            log2.setUrlLlamada(url);
            log2.setHttpMethod("POST");
            log2.setRequestBody(toJson(reqBody));
            log2.setResponseCode(resCode);
            log2.setResponseBody(toJson(resBody));
            log2.setDuracionMs(duracionMs);
            log2.setExitoso(exitoso);
            log2.setFechaLog(LocalDateTime.now());
            log2.setUsuario(usuario);
            log2.setEstado(Constants.ESTADO_ACTIVO);
            paymentLogRepository.save(log2);
        } catch (Exception e) {
            log.warn("No se pudo guardar PaymentLog PayPal: {}", e.getMessage());
        }
    }

    private String toJson(Object obj) {
        if (obj == null) return null;
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "{}"; }
    }

    private String getIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        return (ip != null && !ip.isBlank()) ? ip : request.getRemoteAddr();
    }
}
