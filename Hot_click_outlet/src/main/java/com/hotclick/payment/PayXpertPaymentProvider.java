package com.hotclick.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.config.PayXpertConfig;
import com.hotclick.dto.PaymentWebhookDTO;
import com.hotclick.model.*;
import com.hotclick.repository.*;
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
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Proveedor PayXpert — gestiona la comunicación con la API de PayXpert
 * y el procesamiento de sus webhooks.
 */
@Component
public class PayXpertPaymentProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(PayXpertPaymentProvider.class);

    @Autowired private PayXpertConfig              config;
    @Autowired private PagoRepository              pagoRepository;
    @Autowired private TransaccionPagoRepository   transaccionPagoRepository;
    @Autowired private WebhookEventRepository      webhookEventRepository;
    @Autowired private PaymentLogRepository        paymentLogRepository;
    @Autowired private ObjectMapper                objectMapper;

    // @Lazy evita circular dependency con PaymentService
    @Lazy
    @Autowired private com.hotclick.service.PaymentService paymentService;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Override
    public String getNombre() {
        return "PAYXPERT";
    }

    @Override
    public PaymentSession crearSesion(Pedido pedido, Usuario usuario) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("shopperID",        "USR-" + usuario.getId());
        body.put("currency",         "CRC");
        body.put("amount",           (long) pedido.getTotalPedido() * 100);
        body.put("orderID",          pedido.getNumeroPedido());
        body.put("ctrlCallbackURL",  config.getCallbackUrl());
        body.put("ctrlRedirectURL",  config.getRedirectSuccessUrl() + "?order=" + pedido.getNumeroPedido());
        body.put("ctrlCancelURL",    config.getRedirectCancelUrl()  + "?order=" + pedido.getNumeroPedido());
        body.put("ctrlCustomData",   "pedidoId=" + pedido.getId() + "&usuarioId=" + usuario.getId());
        body.put("shopperFirstName", usuario.getNombre());
        body.put("shopperLastName",  usuario.getApellidoPaterno());
        body.put("shopperEmail",     usuario.getCorreo());
        body.put("shopperPhone",     usuario.getTelefono());

        Map<String, Object> responseMap = llamarApi("/payment/prepare", body, pedido, usuario);

        String merchantToken = (String) responseMap.get("merchantToken");
        String redirectUrl   = (String) responseMap.get("redirectURL");

        if (merchantToken == null || redirectUrl == null) {
            throw new RuntimeException("Respuesta inválida de PayXpert — contacta soporte");
        }

        return new PaymentSession(merchantToken, redirectUrl);
    }

    // ================================================================
    // Procesamiento de webhook PayXpert (idempotente)
    // ================================================================
    @Transactional
    public void procesarWebhook(PaymentWebhookDTO dto, String ipOrigen) {
        String eventoTipo = mapearEvento(dto.getErrorCode(), dto.getStatus());

        // Idempotencia: ignorar eventos ya procesados
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(dto.getMerchantToken(), eventoTipo)) {
            log.warn("Webhook PayXpert duplicado ignorado: token={} tipo={}", dto.getMerchantToken(), eventoTipo);
            return;
        }

        WebhookEvent evento = new WebhookEvent();
        evento.setMerchantToken(dto.getMerchantToken());
        evento.setEventoTipo(eventoTipo);
        evento.setPayloadRaw(toJson(dto));
        evento.setIpOrigen(ipOrigen);
        evento.setFechaRecepcion(LocalDateTime.now());
        evento.setEstado(Constants.ESTADO_ACTIVO);
        webhookEventRepository.save(evento);

        Pago pago = pagoRepository.findByMerchantToken(dto.getMerchantToken()).orElse(null);
        if (pago == null) {
            String msg = "Pago no encontrado para merchantToken: " + dto.getMerchantToken();
            log.error(msg);
            evento.setErrorProcesamiento(msg);
            webhookEventRepository.save(evento);
            return;
        }

        // Validación anti-fraude: monto debe coincidir (null rechazado por seguridad)
        if (dto.getAmount() == null) {
            String alerta = "Webhook PayXpert sin monto — rechazado por seguridad. token=" + dto.getMerchantToken();
            log.error(alerta);
            evento.setErrorProcesamiento(alerta);
            webhookEventRepository.save(evento);
            throw new SecurityException("Webhook PayXpert sin monto — rechazado por seguridad");
        }
        long montoEsperado = (long) pago.getMonto() * 100;
        if (montoEsperado != dto.getAmount()) {
            String alerta = String.format(
                "ALERTA FRAUDE PayXpert: esperado=%d centavos recibido=%d token=%s",
                montoEsperado, dto.getAmount(), dto.getMerchantToken());
            log.error(alerta);
            evento.setErrorProcesamiento(alerta);
            webhookEventRepository.save(evento);
            throw new SecurityException("Validación de monto fallida");
        }

        // Registrar transacción
        TransaccionPago txn = new TransaccionPago();
        txn.setPayxpertTxnId(dto.getTransactionID());
        txn.setErrorCode(dto.getErrorCode() != null ? dto.getErrorCode() : "XXX");
        txn.setErrorMessage(dto.getErrorMessage());
        txn.setCardLast4(dto.getLast4());
        txn.setCardBrand(dto.getCardBrand());
        txn.setTipoOperacion("COBRO");
        txn.setMontoOperacion(dto.getAmount() != null ? dto.getAmount().intValue() : pago.getMonto() * 100);
        txn.setPayloadRespuesta(toJson(dto));
        txn.setFechaTransaccion(LocalDateTime.now());
        txn.setPago(pago);
        txn.setEstado(Constants.ESTADO_ACTIVO);
        transaccionPagoRepository.save(txn);

        // Actualizar estado y disparar lógica de negocio (libera stock en FALLIDO/CANCELADO)
        if (Constants.PAYXPERT_OK.equals(dto.getErrorCode())) {
            pago.setEstadoPago(Constants.PAGO_CAPTURADO);
            pago.setMetodoPagoTipo(dto.getPaymentMethod());
            pago.setFechaActualizacion(LocalDateTime.now());
            pagoRepository.save(pago);
            paymentService.confirmarPedido(pago);
        } else if ("Cancelled".equalsIgnoreCase(dto.getStatus())) {
            paymentService.marcarFallido(pago, "Pago cancelado por el usuario");
        } else {
            paymentService.marcarFallido(pago, "Pago rechazado: " + dto.getErrorMessage());
        }

        evento.setProcesado(true);
        evento.setProcesadoEn(LocalDateTime.now());
        webhookEventRepository.save(evento);

        log.info("Webhook PayXpert procesado: order={} estado={} errorCode={}",
            dto.getOrderID(), pago.getEstadoPago(), dto.getErrorCode());
    }

    // ================================================================
    // Privados
    // ================================================================

    @SuppressWarnings("unchecked")
    private Map<String, Object> llamarApi(String path, Map<String, Object> body,
                                          Pedido pedido, Usuario usuario) throws Exception {
        long inicio = System.currentTimeMillis();
        String url = config.getApiUrl() + path;
        Map<String, Object> responseMap = null;
        int httpStatus = 0;
        boolean exitoso = false;

        try {
            String requestJson = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization",  config.getBasicAuthHeader())
                .header("Content-Type",   "application/json")
                .header("Accept",         "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            httpStatus  = response.statusCode();
            exitoso     = httpStatus >= 200 && httpStatus < 300;
            responseMap = objectMapper.readValue(response.body(), Map.class);

            if (!exitoso) {
                throw new RuntimeException("PayXpert respondió HTTP " + httpStatus + ": " + response.body());
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error llamando PayXpert {}: {}", path, e.getMessage(), e);
            throw new RuntimeException("No se pudo conectar con la pasarela de pago. Intenta de nuevo.");
        } finally {
            guardarLog("CREATE_PAYMENT_PAYXPERT", url, body, httpStatus, responseMap,
                (int)(System.currentTimeMillis() - inicio), usuario, exitoso);
        }

        return responseMap;
    }

    private void guardarLog(String accion, String url, Object reqBody,
                            int resCode, Object resBody, int duracionMs,
                            Usuario usuario, boolean exitoso) {
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
            log.warn("No se pudo guardar PaymentLog PayXpert: {}", e.getMessage());
        }
    }

    private String toJson(Object obj) {
        if (obj == null) return null;
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "{}"; }
    }

    private String mapearEvento(String errorCode, String status) {
        if (Constants.PAYXPERT_OK.equals(errorCode)) return "payment.authorized";
        if ("Cancelled".equalsIgnoreCase(status))    return "payment.cancelled";
        return "payment.failed";
    }
}
