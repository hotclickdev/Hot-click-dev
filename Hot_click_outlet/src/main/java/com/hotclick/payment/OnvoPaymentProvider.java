package com.hotclick.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.model.WebhookEvent;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.PaymentService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Component
public class OnvoPaymentProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(OnvoPaymentProvider.class);

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    @Autowired private OnvoService            onvoService;
    @Autowired private PagoRepository         pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;

    @Lazy
    @Autowired private PaymentService paymentService;

    @Override
    public String getNombre() {
        return "ONVO";
    }

    /**
     * Crea una Checkout Session hospedada en ONVO en CRC nativo (sin conversión de moneda).
     */
    @Override
    public PaymentSession crearSesion(Pedido pedido, Usuario usuario) throws Exception {
        if (onvoService.isMockMode()) {
            throw new IllegalStateException(
                "ONVO no está configurado. " +
                "Añade ONVO_SECRET_KEY (onvo_test_secret_key_...) al entorno para procesar pagos con tarjeta.",
                new IllegalStateException("ONVO_SECRET_KEY"));
        }

        String descripcion = "Pedido HOTCLICK " + pedido.getNumeroPedido();
        String successUrl  = appUrl + "/pago/exito?order=" + pedido.getNumeroPedido();
        String cancelUrl   = appUrl + "/pago/cancelado?order=" + pedido.getNumeroPedido();

        Map<String, String> metadata = Map.of(
            "pedidoId",     String.valueOf(pedido.getId()),
            "numeroPedido", pedido.getNumeroPedido(),
            "empresaId",    String.valueOf(pedido.getEmpresaId())
        );

        OnvoService.OnvoCheckoutSession session = onvoService.crearCheckoutSession(
            pedido.getTotalPedido(), descripcion, successUrl, cancelUrl,
            usuario.getCorreo(), metadata);

        log.info("[onvo] Checkout session creada: {} pedido={}", session.id(), pedido.getNumeroPedido());

        return new PaymentSession(session.id(), session.url());
    }

    /**
     * Procesa el evento checkout-session.succeeded del webhook de ONVO.
     * Es idempotente: si el sessionId ya fue procesado, no hace nada.
     */
    /** Resultado de la verificación contra ONVO. */
    public enum Verificacion { OK, DUPLICADO, NO_PAGADO, NO_ENCONTRADO, DATOS_DISTINTOS }

    /**
     * WH-1: valida estado, monto, moneda y empresaId de la sesión leída de ONVO contra el pago local.
     * Solo si todo coincide confirma el pedido (idempotente por sessionId).
     */
    @Transactional
    public Verificacion procesarPagoVerificado(String sessionId, Map<?, ?> sesionOnvo, String ipOrigen) {
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(sessionId, "checkout-session.succeeded")) {
            return Verificacion.DUPLICADO;
        }
        if (sesionOnvo == null || sesionOnvo.isEmpty()) return Verificacion.NO_ENCONTRADO;
        String status = String.valueOf(sesionOnvo.get("status"));
        if (!"succeeded".equalsIgnoreCase(status) && !"paid".equalsIgnoreCase(status)
                && !"completed".equalsIgnoreCase(status)) {
            return Verificacion.NO_PAGADO;
        }
        Pago pago = pagoRepository.findByMerchantToken(sessionId).orElse(null);
        if (pago == null || pago.getPedido() == null) return Verificacion.NO_ENCONTRADO;
        if (!coincide(pago, sesionOnvo)) {
            log.warn("[onvo] Datos de sesión no coinciden con el pago local: pedido={}", pago.getPedido().getNumeroPedido());
            return Verificacion.DATOS_DISTINTOS;
        }
        procesarPagoExitoso(sessionId, "{\"verificado\":\"GET ONVO\"}", ipOrigen);
        return Verificacion.OK;
    }

    static boolean coincide(Pago pago, Map<?, ?> s) {
        Object monto = s.get("totalAmount") != null ? s.get("totalAmount") : s.get("amount");
        Object moneda = s.get("currency");
        Object meta = s.get("metadata");
        Object empresaMeta = meta instanceof Map<?, ?> m ? m.get("empresaId") : null;
        Long empresaLocal = pago.getPedido().getEmpresaId();
        Integer montoLocal = pago.getMonto() != null ? pago.getMonto() : pago.getPedido().getTotalPedido();
        if (monto == null || montoLocal == null || moneda == null || empresaMeta == null || empresaLocal == null) {
            return false;
        }
        long montoOnvo;
        try { montoOnvo = new java.math.BigDecimal(String.valueOf(monto)).longValueExact(); }
        catch (ArithmeticException | NumberFormatException e) { return false; }
        return montoOnvo == montoLocal.longValue()
            && "CRC".equalsIgnoreCase(String.valueOf(moneda))
            && String.valueOf(empresaLocal).equals(String.valueOf(empresaMeta));
    }

    @Transactional
    public void procesarPagoExitoso(String checkoutSessionId, String rawBody, String ipOrigen) {
        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(
                checkoutSessionId, "checkout-session.succeeded")) {
            log.info("[onvo] Webhook duplicado ignorado: sessionId={}", checkoutSessionId);
            return;
        }

        WebhookEvent evento = new WebhookEvent();
        evento.setMerchantToken(checkoutSessionId);
        evento.setEventoTipo("checkout-session.succeeded");
        evento.setPayloadRaw(rawBody);
        evento.setIpOrigen(ipOrigen);
        evento.setFechaRecepcion(LocalDateTime.now(Constants.ZONA_CR));
        evento.setEstado(Constants.ESTADO_ACTIVO);
        webhookEventRepository.save(evento);

        Pago pago = pagoRepository.findByMerchantToken(checkoutSessionId).orElse(null);
        if (pago == null) {
            String msg = "Pago no encontrado para ONVO sessionId=" + checkoutSessionId;
            log.error("[onvo] {}", msg);
            evento.setErrorProcesamiento(msg);
            webhookEventRepository.save(evento);
            return;
        }

        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            log.info("[onvo] Checkout ya confirmado: sessionId={}", checkoutSessionId);
            evento.setProcesado(true);
            evento.setProcesadoEn(LocalDateTime.now(Constants.ZONA_CR));
            webhookEventRepository.save(evento);
            return;
        }

        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setMetodoPagoTipo(Constants.PROVEEDOR_ONVO);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);

        paymentService.confirmarPedido(pago);

        evento.setProcesado(true);
        evento.setProcesadoEn(LocalDateTime.now(Constants.ZONA_CR));
        webhookEventRepository.save(evento);

        log.info("[onvo] Checkout confirmado: sessionId={}", checkoutSessionId);
    }
}
