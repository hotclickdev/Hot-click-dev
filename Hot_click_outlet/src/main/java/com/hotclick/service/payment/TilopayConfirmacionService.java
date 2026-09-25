package com.hotclick.service.payment;

import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.WebhookEvent;
import com.hotclick.payment.PaymentSession;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.PaymentService;
import com.hotclick.service.TilopayService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class TilopayConfirmacionService {

    private static final Logger log = LoggerFactory.getLogger(TilopayConfirmacionService.class);
    private static final String EVENTO_CONFIRMAR = "tilopay.confirm";
    private static final String EVENTO_WEBHOOK = "tilopay.webhook";

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private TilopayService tilopayService;
    @Autowired private TilopayPaymentProviderAccess providerAccess;

    @Lazy
    @Autowired private PaymentService paymentService;

    /**
     * Confirma pago Tilopay reconsultando la API (nunca confiar solo en query del browser).
     */
    @Transactional
    public PaymentStatusResponse confirmar(String numeroPedido, Map<String, String> queryParams) {
        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado: " + numeroPedido));
        Pago pago = pagoRepository.findTopByPedidoId(pedido.getId())
            .orElseThrow(() -> new RecursoNoEncontradoException("Pago no encontrado: " + numeroPedido));

        if (!Constants.PROVEEDOR_TILOPAY.equalsIgnoreCase(pago.getProveedor())) {
            throw new IllegalStateException("El pedido no es Tilopay: " + pago.getProveedor());
        }

        String orderNumber = pago.getMerchantToken() != null
            ? pago.getMerchantToken()
            : numeroPedido;

        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            log.info("[tilopay] Confirmación duplicada ignorada order={}", orderNumber);
            return paymentService.buildStatusResponse(pago);
        }

        TilopayService.ConsultaResultado consulta = tilopayService.consultarTransaccion(orderNumber);
        String raw = toJsonPayload(queryParams, consulta);
        if (!webhookEventRepository.existsByMerchantTokenAndEventoTipo(orderNumber, EVENTO_CONFIRMAR)) {
            guardarEvento(orderNumber, EVENTO_CONFIRMAR, raw);
        }

        if (consulta.aprobada()) {
            aplicarAprobado(pago, orderNumber);
            return paymentService.buildStatusResponse(pago);
        }

        aplicarRechazado(pago, consulta.description());
        return paymentService.buildStatusResponse(pago);
    }

    /**
     * Webhook placeholder: reconsulta y confirma si aplica.
     */
    @Transactional
    public void procesarWebhook(String orderNumber, String rawBody) {
        if (blank(orderNumber)) {
            log.warn("[tilopay] Webhook sin orderNumber");
            return;
        }
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(orderNumber, EVENTO_WEBHOOK)) {
            log.info("[tilopay] Webhook duplicado order={}", orderNumber);
            return;
        }
        guardarEvento(orderNumber, EVENTO_WEBHOOK, rawBody);

        Pago pago = pagoRepository.findByMerchantToken(orderNumber).orElse(null);
        if (pago == null) {
            log.error("[tilopay] Webhook: pago no encontrado order={}", orderNumber);
            return;
        }
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            return;
        }

        TilopayService.ConsultaResultado consulta = tilopayService.consultarTransaccion(orderNumber);
        if (consulta.aprobada()) {
            aplicarAprobado(pago, orderNumber);
        }
    }

    /**
     * Nuevo intento: orderNumber-R2, R3… y nuevo sdkToken.
     */
    @Transactional
    public PaymentSession reintentar(String numeroPedido) {
        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado: " + numeroPedido));
        Pago pago = pagoRepository.findTopByPedidoId(pedido.getId())
            .orElseThrow(() -> new RecursoNoEncontradoException("Pago no encontrado: " + numeroPedido));

        if (!Constants.PROVEEDOR_TILOPAY.equalsIgnoreCase(pago.getProveedor())) {
            throw new IllegalStateException("Solo se puede reintentar pagos Tilopay");
        }
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            throw new IllegalStateException("El pago ya está capturado");
        }
        if (Constants.PEDIDO_CANCELADO.equals(pedido.getEstadoPedido())) {
            throw new IllegalStateException("El pedido está cancelado");
        }

        String actual = pago.getMerchantToken() != null ? pago.getMerchantToken() : numeroPedido;
        int intento = 2;
        if (actual.contains("-R")) {
            String suf = actual.substring(actual.lastIndexOf("-R") + 2);
            try {
                intento = Integer.parseInt(suf) + 1;
            } catch (NumberFormatException ignored) {
                intento = 2;
            }
        }
        String nuevoOrder = numeroPedido + "-R" + intento;
        PaymentSession session = providerAccess.nuevaSesion(pedido, nuevoOrder);

        pago.setMerchantToken(nuevoOrder);
        pago.setRedirectUrl(session.redirectUrl());
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pago.setFechaExpiracion(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(30));
        pagoRepository.save(pago);

        log.info("[tilopay] Reintento pedido={} order={}", numeroPedido, nuevoOrder);
        return session;
    }

    /**
     * Usado por cleanup: si Tilopay ya aprobó, confirma en vez de cancelar.
     */
    @Transactional
    public boolean intentarConfirmarSiAprobado(Pago pago) {
        if (!Constants.PROVEEDOR_TILOPAY.equalsIgnoreCase(pago.getProveedor())) {
            return false;
        }
        if (!Constants.PAGO_PENDIENTE.equals(pago.getEstadoPago())) {
            return false;
        }
        String orderNumber = pago.getMerchantToken();
        TilopayService.ConsultaResultado consulta = tilopayService.consultarTransaccion(orderNumber);
        if (!consulta.aprobada()) {
            return false;
        }
        aplicarAprobado(pago, orderNumber);
        return true;
    }

    private void aplicarAprobado(Pago pago, String orderNumber) {
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setMetodoPagoTipo(Constants.PROVEEDOR_TILOPAY);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);
        paymentService.confirmarPedido(pago);
        log.info("[tilopay] Pago CAPTURADO order={}", orderNumber);
    }

    private void aplicarRechazado(Pago pago, String motivo) {
        paymentService.marcarFallido(pago, motivo != null ? motivo : "Tilopay rechazado");
        log.info("[tilopay] Pago FALLIDO pedido={} motivo={}",
            pago.getPedido() != null ? pago.getPedido().getNumeroPedido() : "?", motivo);
    }

    private void guardarEvento(String merchantToken, String tipo, String raw) {
        WebhookEvent evento = new WebhookEvent();
        evento.setMerchantToken(merchantToken);
        evento.setEventoTipo(tipo);
        evento.setPayloadRaw(raw != null && raw.length() > 4000 ? raw.substring(0, 4000) : raw);
        evento.setFechaRecepcion(LocalDateTime.now(Constants.ZONA_CR));
        evento.setEstado(Constants.ESTADO_ACTIVO);
        evento.setProcesado(true);
        evento.setProcesadoEn(LocalDateTime.now(Constants.ZONA_CR));
        webhookEventRepository.save(evento);
    }

    private static String toJsonPayload(Map<String, String> queryParams,
                                        TilopayService.ConsultaResultado consulta) {
        String q = queryParams != null ? queryParams.toString().replace("\"", "'") : "";
        String c = consulta != null
            ? ("aprobada=" + consulta.aprobada() + ",code=" + consulta.code())
            : "";
        return "{\"query\":\"" + q + "\",\"consult\":\"" + c + "\"}";
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
