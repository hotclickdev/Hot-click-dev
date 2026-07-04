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
                "Añade ONVO_SECRET_KEY (onvo_test_secret_key_...) al entorno para procesar pagos con tarjeta.");
        }

        String descripcion = "Pedido HOTCLICK " + pedido.getNumeroPedido();
        String successUrl  = appUrl + "/pago/exito?order=" + pedido.getNumeroPedido();
        String cancelUrl   = appUrl + "/pago/cancelado?order=" + pedido.getNumeroPedido();

        Map<String, String> metadata = Map.of(
            "pedidoId",     String.valueOf(pedido.getId()),
            "numeroPedido", pedido.getNumeroPedido()
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
