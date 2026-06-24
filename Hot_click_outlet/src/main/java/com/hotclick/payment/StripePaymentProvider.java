package com.hotclick.payment;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.BccrService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.StripeService;
import com.hotclick.utils.Constants;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class StripePaymentProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentProvider.class);

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    @Autowired private StripeService             stripeService;
    @Autowired private BccrService               bccrService;
    @Autowired private PagoRepository            pagoRepository;
    @Autowired private WebhookEventRepository    webhookEventRepository;

    @Lazy
    @Autowired private PaymentService paymentService;

    @Override
    public String getNombre() {
        return "STRIPE";
    }

    /**
     * Crea una Stripe Checkout Session en modo PAYMENT.
     * Convierte el total de CRC a USD usando el TC del BCCR (Stripe no acepta CRC).
     */
    @Override
    public PaymentSession crearSesion(Pedido pedido, Usuario usuario) throws Exception {
        if (stripeService.isMockMode()) {
            throw new IllegalStateException(
                "Stripe no está configurado. " +
                "Añade STRIPE_SECRET_KEY (sk_test_...) al entorno para procesar pagos con tarjeta.");
        }

        int tc = bccrService.getTipoCambioVenta();
        long amountCents = (long) Math.ceil((double) pedido.getTotalPedido() / tc * 100.0);

        // Expiry set to 35 min — Stripe minimum is 30 min; the buffer avoids boundary
        // failures caused by network latency between calculation and Stripe receiving the request.
        SessionCreateParams params = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setCustomerEmail(usuario.getCorreo())
            .setSuccessUrl(appUrl + "/pago/exito?order=" + pedido.getNumeroPedido()
                + "&session_id={CHECKOUT_SESSION_ID}")
            .setCancelUrl(appUrl + "/pago/cancelado?order=" + pedido.getNumeroPedido())
            .addLineItem(SessionCreateParams.LineItem.builder()
                .setQuantity(1L)
                .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                    .setCurrency("usd")
                    .setUnitAmount(amountCents)
                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName("Pedido HOTCLICK " + pedido.getNumeroPedido())
                        .build())
                    .build())
                .build())
            .putMetadata("pedidoId",      String.valueOf(pedido.getId()))
            .putMetadata("numeroPedido",  pedido.getNumeroPedido())
            .setExpiresAt(System.currentTimeMillis() / 1000 + 35 * 60L)
            .build();

        Session session = Session.create(params);

        log.info("[stripe] Checkout session creada: {} pedido={} amountCents={}",
            session.getId(), pedido.getNumeroPedido(), amountCents);

        return new PaymentSession(session.getId(), session.getUrl());
    }

    /**
     * Procesa el evento checkout.session.completed del webhook de Stripe.
     * Es idempotente: si el sessionId ya fue procesado, no hace nada.
     */
    @Transactional
    public void procesarCheckoutCompletado(Session session, String rawBody, String ipOrigen) {
        String sessionId     = session.getId();
        String numeroPedido  = session.getMetadata() != null
            ? session.getMetadata().get("numeroPedido") : null;

        if (webhookEventRepository.existsByMerchantTokenAndEventoTipo(
                sessionId, "checkout.session.completed")) {
            log.info("[stripe] Webhook duplicado ignorado: sessionId={}", sessionId);
            return;
        }

        WebhookEvent evento = new WebhookEvent();
        evento.setMerchantToken(sessionId);
        evento.setEventoTipo("checkout.session.completed");
        evento.setPayloadRaw(rawBody);
        evento.setIpOrigen(ipOrigen);
        evento.setFechaRecepcion(LocalDateTime.now(Constants.ZONA_CR));
        evento.setEstado(Constants.ESTADO_ACTIVO);
        webhookEventRepository.save(evento);

        Pago pago = pagoRepository.findByMerchantToken(sessionId).orElse(null);
        if (pago == null) {
            String msg = "Pago no encontrado para Stripe sessionId=" + sessionId
                + (numeroPedido != null ? " numeroPedido=" + numeroPedido : "");
            log.error("[stripe] {}", msg);
            evento.setErrorProcesamiento(msg);
            webhookEventRepository.save(evento);
            return;
        }

        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            log.info("[stripe] Checkout ya confirmado: sessionId={}", sessionId);
            evento.setProcesado(true);
            evento.setProcesadoEn(LocalDateTime.now(Constants.ZONA_CR));
            webhookEventRepository.save(evento);
            return;
        }

        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setMetodoPagoTipo("STRIPE");
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);

        paymentService.confirmarPedido(pago);

        evento.setProcesado(true);
        evento.setProcesadoEn(LocalDateTime.now(Constants.ZONA_CR));
        webhookEventRepository.save(evento);

        log.info("[stripe] Checkout confirmado: sessionId={} pedido={}", sessionId, numeroPedido);
    }
}
