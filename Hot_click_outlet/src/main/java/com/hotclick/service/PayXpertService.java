package com.hotclick.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.config.PayXpertConfig;
import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.dto.PaymentWebhookDTO;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class PayXpertService {

    private static final Logger log = LoggerFactory.getLogger(PayXpertService.class);

    @Autowired private PayXpertConfig             config;
    @Autowired private PedidoRepository           pedidoRepository;
    @Autowired private ProductoRepository          productoRepository;
    @Autowired private BodegaRepository            bodegaRepository;
    @Autowired private UsuarioRepository           usuarioRepository;
    @Autowired private PagoRepository              pagoRepository;
    @Autowired private TransaccionPagoRepository   transaccionPagoRepository;
    @Autowired private WebhookEventRepository      webhookEventRepository;
    @Autowired private PaymentLogRepository        paymentLogRepository;
    @Autowired private ObjectMapper                objectMapper;
    @Autowired private NotificacionEmailService    notificacionEmailService;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    // ================================================================
    // 1. CHECKOUT — Crea pedido PENDIENTE + sesión PayXpert
    // ================================================================
    @Transactional
    public PaymentCheckoutResponse checkout(PaymentCheckoutRequest req, String correoUsuario) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new IllegalArgumentException("El carrito no tiene productos");
        }

        Usuario usuario = usuarioRepository.findByCorreo(correoUsuario)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + correoUsuario));

        Long bodegaId = req.getBodegaId() != null ? req.getBodegaId() : 1L;
        Bodega bodega = bodegaRepository.findById(bodegaId)
            .orElseThrow(() -> new RuntimeException("Bodega no encontrada: " + bodegaId));

        // Calcular totales tomando precios siempre de la DB (nunca del frontend)
        int subtotal   = 0;
        int costoTotal = 0;
        for (PaymentCheckoutRequest.ItemDTO item : req.getItems()) {
            Producto p = productoRepository.findById(item.getProductoId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + item.getProductoId()));
            if (p.getStockActual() < item.getCantidad()) {
                throw new IllegalStateException("Stock insuficiente para: " + p.getNombreProducto());
            }
            subtotal   += p.getPrecioVenta()  * item.getCantidad();
            costoTotal += p.getPrecioCompra() * item.getCantidad();
        }

        int costoEnvio = "ENVIO_A_DOMICILIO".equals(req.getMetodoEnvio()) ? 2000 : 0;
        int total      = subtotal + costoEnvio;

        // Crear Pedido PENDIENTE (sin reducir stock todavía)
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("ORD-" + System.currentTimeMillis());
        pedido.setFechaPedido(LocalDateTime.now());
        pedido.setSubtotal(subtotal);
        pedido.setTotalPedido(total);
        pedido.setCostoEnvio(costoEnvio);
        pedido.setCostoTotalProductos(costoTotal);
        pedido.setUtilidadBruta(subtotal - costoTotal);
        pedido.setDescuentoTotal(0);
        pedido.setMontoImpuesto(0);
        pedido.setAplicaImpuesto(false);
        if (subtotal > 0) {
            pedido.setMargenGananciaPedido(
                BigDecimal.valueOf(subtotal - costoTotal)
                    .divide(BigDecimal.valueOf(subtotal), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
            );
        }
        pedido.setMetodoPago(Constants.METODO_PAYXPERT);
        pedido.setMetodoEnvio(req.getMetodoEnvio() != null ? req.getMetodoEnvio() : "RETIRO_EN_TIENDA");
        pedido.setNotas(req.getNotas());
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setUsuarioFinal(usuario);
        pedido.setBodega(bodega);
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        pedidoRepository.save(pedido);

        // Crear PedidoItems (snapshot de precios actuales)
        for (PaymentCheckoutRequest.ItemDTO item : req.getItems()) {
            Producto p = productoRepository.findById(item.getProductoId()).orElseThrow();
            PedidoItem pi = new PedidoItem();
            pi.setCantidad(item.getCantidad());
            pi.setPrecioUnitarioMomento(p.getPrecioVenta());
            pi.setCostoUnitarioMomento(p.getPrecioCompra());
            pi.setSubtotalItem(p.getPrecioVenta() * item.getCantidad());
            pi.setUtilidadItem((p.getPrecioVenta() - p.getPrecioCompra()) * item.getCantidad());
            pi.setDescuentoAplicado(0);
            pi.setProducto(p);
            pi.setPedido(pedido);
            pi.setEstado(Constants.ESTADO_ACTIVO);
            pedido.getItems().add(pi);
        }
        pedidoRepository.save(pedido);

        // Llamar a PayXpert para crear sesión de pago
        Map<String, Object> body = new HashMap<>();
        body.put("shopperID",       "USR-" + usuario.getId());
        body.put("currency",        "CRC");
        body.put("amount",          (long) total * 100);
        body.put("orderID",         pedido.getNumeroPedido());
        body.put("ctrlCallbackURL", config.getCallbackUrl());
        body.put("ctrlRedirectURL", config.getRedirectSuccessUrl() + "?order=" + pedido.getNumeroPedido());
        body.put("ctrlCancelURL",   config.getRedirectCancelUrl()  + "?order=" + pedido.getNumeroPedido());
        body.put("ctrlCustomData",  "pedidoId=" + pedido.getId() + "&usuarioId=" + usuario.getId());
        body.put("shopperFirstName", usuario.getNombre());
        body.put("shopperLastName",  usuario.getApellidoPaterno());
        body.put("shopperEmail",     usuario.getCorreo());
        body.put("shopperPhone",     usuario.getTelefono());

        Map<String, Object> responseMap = llamarPayXpert("/payment/prepare", body, pedido, usuario);

        String merchantToken = (String) responseMap.get("merchantToken");
        String redirectUrl   = (String) responseMap.get("redirectURL");

        if (merchantToken == null || redirectUrl == null) {
            throw new RuntimeException("Respuesta inválida de PayXpert — contacta soporte");
        }

        // Guardar sesión de pago
        Pago pago = new Pago();
        pago.setMerchantToken(merchantToken);
        pago.setRedirectUrl(redirectUrl);
        pago.setMonto(total);
        pago.setMoneda("CRC");
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setFechaCreacion(LocalDateTime.now());
        pago.setFechaActualizacion(LocalDateTime.now());
        pago.setFechaExpiracion(LocalDateTime.now().plusMinutes(config.getTtlMinutes()));
        pago.setPedido(pedido);
        pago.setUsuario(usuario);
        pago.setEstado(Constants.ESTADO_ACTIVO);
        pagoRepository.save(pago);

        return new PaymentCheckoutResponse(
            pedido.getId(), pedido.getNumeroPedido(), redirectUrl, Constants.PAGO_PENDIENTE, total
        );
    }

    // ================================================================
    // 2. PROCESAR WEBHOOK — Idempotente, valida monto, confirma pedido
    // ================================================================
    @Transactional
    public void procesarWebhook(PaymentWebhookDTO dto, String ipOrigen) {
        String eventoTipo = mapearEvento(dto.getErrorCode(), dto.getStatus());

        // Idempotencia: si ya procesamos este evento, ignorarlo silenciosamente
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(dto.getMerchantToken(), eventoTipo)) {
            log.warn("Webhook duplicado ignorado: token={} tipo={}", dto.getMerchantToken(), eventoTipo);
            return;
        }

        // Guardar evento antes de procesar (para idempotencia aunque falle)
        WebhookEvent evento = new WebhookEvent();
        evento.setMerchantToken(dto.getMerchantToken());
        evento.setEventoTipo(eventoTipo);
        evento.setPayloadRaw(toJson(dto));
        evento.setIpOrigen(ipOrigen);
        evento.setFechaRecepcion(LocalDateTime.now());
        evento.setEstado(Constants.ESTADO_ACTIVO);
        webhookEventRepository.save(evento);

        // Buscar el pago por merchantToken
        Pago pago = pagoRepository.findByMerchantToken(dto.getMerchantToken()).orElse(null);
        if (pago == null) {
            String msg = "Pago no encontrado para merchantToken: " + dto.getMerchantToken();
            log.error(msg);
            evento.setErrorProcesamiento(msg);
            webhookEventRepository.save(evento);
            return;
        }

        // Validación anti-fraude: el monto del webhook debe coincidir con el monto que guardamos
        if (dto.getAmount() != null) {
            long montoEsperado = (long) pago.getMonto() * 100;
            if (montoEsperado != dto.getAmount()) {
                String alerta = String.format(
                    "ALERTA FRAUDE: monto esperado=%d centavos, recibido=%d centavos, token=%s",
                    montoEsperado, dto.getAmount(), dto.getMerchantToken()
                );
                log.error(alerta);
                evento.setErrorProcesamiento(alerta);
                webhookEventRepository.save(evento);
                throw new SecurityException("Validación de monto fallida");
            }
        }

        // Registrar la transacción
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

        // Actualizar estado del pago
        if (Constants.PAYXPERT_OK.equals(dto.getErrorCode())) {
            pago.setEstadoPago(Constants.PAGO_CAPTURADO);
            pago.setMetodoPagoTipo(dto.getPaymentMethod());
        } else if ("Cancelled".equalsIgnoreCase(dto.getStatus())) {
            pago.setEstadoPago(Constants.PAGO_CANCELADO);
        } else {
            pago.setEstadoPago(Constants.PAGO_FALLIDO);
        }
        pago.setFechaActualizacion(LocalDateTime.now());
        pagoRepository.save(pago);

        // Confirmar pedido solo si el pago fue exitoso
        if (Constants.PAYXPERT_OK.equals(dto.getErrorCode())) {
            confirmarPedido(pago);
        }

        // Marcar webhook como procesado
        evento.setProcesado(true);
        evento.setProcesadoEn(LocalDateTime.now());
        webhookEventRepository.save(evento);

        log.info("Webhook procesado: order={} estado={} errorCode={}",
            dto.getOrderID(), pago.getEstadoPago(), dto.getErrorCode());
    }

    // ================================================================
    // 3. CONSULTAR ESTADO
    // ================================================================
    @Transactional(readOnly = true)
    public PaymentStatusResponse consultarEstado(String numeroPedido) {
        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado: " + numeroPedido));

        Pago pago = pagoRepository.findTopByPedidoId(pedido.getId())
            .orElseThrow(() -> new RuntimeException("Pago no encontrado para pedido: " + numeroPedido));

        TransaccionPago txn = transaccionPagoRepository
            .findTopByPagoIdOrderByFechaTransaccionDesc(pago.getId())
            .orElse(null);

        PaymentStatusResponse resp = new PaymentStatusResponse();
        resp.setPagoId(pago.getId());
        resp.setEstadoPago(pago.getEstadoPago());
        resp.setNumeroPedido(pedido.getNumeroPedido());
        resp.setMetodoPago(pago.getMetodoPagoTipo());
        resp.setTotal(pago.getMonto());
        if (txn != null) {
            resp.setCardLast4(txn.getCardLast4());
            resp.setCardBrand(txn.getCardBrand());
            resp.setFechaTransaccion(txn.getFechaTransaccion().toString());
        }
        return resp;
    }

    // ================================================================
    // PRIVADOS
    // ================================================================

    private void confirmarPedido(Pago pago) {
        Pedido pedido = pago.getPedido();
        // Forzar carga de items en la sesión activa
        pedido.getItems().size();

        // Reducir stock con bloqueo pesimista por producto
        for (PedidoItem item : pedido.getItems()) {
            Producto producto = productoRepository.findByIdForUpdate(item.getProducto().getId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado al confirmar pago"));

            int nuevoStock = producto.getStockActual() - item.getCantidad();
            if (nuevoStock < 0) {
                log.warn("Stock negativo detectado para producto {}, ajustando a 0", producto.getId());
                nuevoStock = 0;
            }
            producto.setStockActual(nuevoStock);

            if (Boolean.TRUE.equals(producto.getEsUnico())) {
                producto.setVendido(true);
                producto.setVisibleCatalogo(false);
            }
            productoRepository.save(producto);
        }

        pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
        pedidoRepository.save(pedido);

        notificacionEmailService.enviarConfirmacionPedido(pedido);
        log.info("Pedido {} confirmado como PAGADO", pedido.getNumeroPedido());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> llamarPayXpert(String path, Map<String, Object> body,
                                               Pedido pedido, Usuario usuario) {
        long inicio = System.currentTimeMillis();
        String url = config.getApiUrl() + path;
        Map<String, Object> responseMap = null;
        int httpStatus = 0;
        boolean exitoso = false;

        try {
            String requestJson = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization", config.getBasicAuthHeader())
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            httpStatus = response.statusCode();
            exitoso   = httpStatus >= 200 && httpStatus < 300;
            responseMap = objectMapper.readValue(response.body(), Map.class);

        } catch (Exception e) {
            log.error("Error en llamada a PayXpert {}: {}", path, e.getMessage(), e);
            throw new RuntimeException("No se pudo conectar con la pasarela de pago. Intenta de nuevo.");
        } finally {
            guardarLog("CREATE_PAYMENT", url, "POST", body, httpStatus,
                responseMap, (int)(System.currentTimeMillis() - inicio),
                null, usuario, exitoso);
        }

        return responseMap;
    }

    private void guardarLog(String accion, String url, String method,
                            Object reqBody, int resCode, Object resBody,
                            int duracionMs, Pago pago, Usuario usuario, boolean exitoso) {
        try {
            PaymentLog log2 = new PaymentLog();
            log2.setAccion(accion);
            log2.setUrlLlamada(url);
            log2.setHttpMethod(method);
            log2.setRequestBody(toJson(reqBody));
            log2.setResponseCode(resCode);
            log2.setResponseBody(toJson(resBody));
            log2.setDuracionMs(duracionMs);
            log2.setExitoso(exitoso);
            log2.setFechaLog(LocalDateTime.now());
            log2.setPago(pago);
            log2.setUsuario(usuario);
            log2.setEstado(Constants.ESTADO_ACTIVO);
            paymentLogRepository.save(log2);
        } catch (Exception e) {
            log.warn("No se pudo guardar PaymentLog: {}", e.getMessage());
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
