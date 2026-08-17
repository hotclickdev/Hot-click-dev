package com.hotclick.service;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.model.*;
import com.hotclick.payment.PaymentProviderFactory;
import com.hotclick.payment.PaymentSession;
import com.hotclick.repository.*;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.service.payment.*;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio central de pagos.
 *
 * Flujo de stock:
 *   checkout()        → reserva stockReservado (SELECT FOR UPDATE)
 *   confirmarPedido() → descuenta stockActual + libera stockReservado
 *   liberarReservas() → solo libera stockReservado (pago cancelado/fallido/expirado)
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    @Autowired private PaymentProviderFactory           providerFactory;
    @Autowired private PedidoRepository                 pedidoRepository;
    @Autowired private PagoRepository                 pagoRepository;
    @Autowired private GiftCardService                  giftCardService;
    @Autowired private ApplicationEventPublisher        eventPublisher;

    @Autowired private CheckoutValidator                checkoutValidator;
    @Autowired private GuestUserResolver                guestUserResolver;
    @Autowired private StockReservationService          stockReservationService;
    @Autowired private OrderPricingService              orderPricingService;
    @Autowired private CheckoutOrderFactory             checkoutOrderFactory;
    @Autowired private PaymentRecordFactory             paymentRecordFactory;
    @Autowired private PaymentStatusAssembler           paymentStatusAssembler;
    @Autowired private PaymentNotificationsFacade       paymentNotificationsFacade;
    @Autowired private PaymentOrderConfirmationService  orderConfirmationService;
    @Autowired private PaymentFailureHandler            paymentFailureHandler;
    @Autowired private PaymentUserCancellationService   userCancellationService;
    @Autowired private SinpePaymentAdminService         sinpePaymentAdminService;

    @Transactional
    public PaymentCheckoutResponse checkout(PaymentCheckoutRequest req, String correoUsuario) {
        checkoutValidator.validateCartNotEmpty(req);

        String provider = checkoutValidator.resolveProvider(req, providerFactory);
        String emailEfectivo = checkoutValidator.resolveEffectiveEmail(correoUsuario, req);
        Usuario usuario = guestUserResolver.resolve(emailEfectivo, req.getGuestPhone());

        Long bodegaId = req.getBodegaId() != null ? req.getBodegaId() : 1L;
        Bodega bodega = checkoutValidator.loadBodega(bodegaId);
        checkoutValidator.assertBodegaTenant(bodega, bodegaId);

        StockReservationResult reservation = stockReservationService.reserveForCheckout(req.getItems());
        checkoutValidator.validateRetiroEnTienda(req.getMetodoEnvio(), bodega, bodegaId, reservation.productosMap());

        OrderPricingResult pricing = orderPricingService.calculate(req, bodega, reservation.subtotal());

        Pedido pedido = checkoutOrderFactory.createPendingOrder(
            req, pricing, reservation.subtotal(), reservation.costoTotal(), provider, usuario, bodega);
        checkoutOrderFactory.addItemSnapshots(pedido, req.getItems(), reservation.productosMap());

        if (pricing.pagoGC()) {
            stockReservationService.consumeForGiftCard(pedido);
            pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
            pedido.setMetodoPago("GIFT_CARD");
            pedidoRepository.save(pedido);
            giftCardService.canjear(pricing.gcCodigo(), pedido, pricing.gcMonto());
            paymentNotificationsFacade.onGiftCardFullPayment(pedido, pricing.gcCodigo());
            return new PaymentCheckoutResponse(pedido.getId(), pedido.getNumeroPedido(),
                null, "PAGADO", 0, "GIFT_CARD");
        }

        PaymentSession session;
        try {
            session = providerFactory.get(provider).crearSesion(pedido, usuario);
        } catch (RuntimeException e) {
            stockReservationService.liberarReservas(pedido);
            throw e;
        } catch (Exception e) {
            stockReservationService.liberarReservas(pedido);
            throw new IntegracionExternaException(provider, IntegracionExternaException.Tipo.IO_ERROR,
                "Error iniciando sesión de pago: " + e.getMessage(), e);
        }

        paymentRecordFactory.createAndPersist(session, pedido, usuario, provider, pricing.total());

        log.info("Checkout iniciado: provider={} pedido={} total={}",
            provider, pedido.getNumeroPedido(), pricing.total());

        paymentNotificationsFacade.onPedidoCreado(pedido, provider);

        return new PaymentCheckoutResponse(
            pedido.getId(), pedido.getNumeroPedido(),
            session.redirectUrl(), Constants.PAGO_PENDIENTE, pricing.total(), provider);
    }

    @Transactional
    public void confirmarPedido(Pago pago) {
        orderConfirmationService.confirmarPedido(pago, this, eventPublisher);
    }

    @Transactional
    public void liberarReservas(Pedido pedido) {
        stockReservationService.liberarReservas(pedido);
    }

    @Transactional
    public void cancelarPorUsuario(String numeroPedido, String correoUsuario) {
        userCancellationService.cancelarPorUsuario(numeroPedido, correoUsuario);
    }

    @Transactional(readOnly = true)
    public PaymentStatusResponse consultarEstado(String numeroPedido) {
        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado: " + numeroPedido));
        Pago pago = pagoRepository.findTopByPedidoId(pedido.getId())
            .orElseThrow(() -> new RecursoNoEncontradoException("Pago no encontrado para pedido: " + numeroPedido));
        return buildStatusResponse(pago);
    }

    @Transactional
    public void marcarFallido(Pago pago, String motivo) {
        paymentFailureHandler.marcarFallido(pago, motivo);
    }

    @Transactional
    public PaymentStatusResponse confirmarSinpe(Long pagoId) {
        return sinpePaymentAdminService.confirmarSinpe(pagoId, this, eventPublisher);
    }

    @Transactional
    public void rechazarSinpe(Long pagoId, String motivo) {
        sinpePaymentAdminService.rechazarSinpe(pagoId, motivo);
    }

    @Transactional
    public void cancelarAnon(String numeroPedido) {
        userCancellationService.cancelarAnon(numeroPedido);
    }

    public PaymentStatusResponse buildStatusResponse(Pago pago) {
        return paymentStatusAssembler.build(pago);
    }
}
