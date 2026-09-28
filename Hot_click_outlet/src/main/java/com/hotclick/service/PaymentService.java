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
import com.hotclick.service.pos.PosQrVentaService;
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
    @Autowired private CheckoutGrupoFactory             checkoutGrupoFactory;
    @Autowired private PedidoGrupoService               pedidoGrupoService;
    @Autowired private PaymentRecordFactory             paymentRecordFactory;
    @Autowired private PaymentStatusAssembler           paymentStatusAssembler;
    @Autowired private PaymentNotificationsFacade       paymentNotificationsFacade;
    @Autowired private PaymentOrderConfirmationService  orderConfirmationService;
    @Autowired private PaymentFailureHandler            paymentFailureHandler;
    @Autowired private PaymentUserCancellationService   userCancellationService;
    @Autowired private SinpePaymentAdminService         sinpePaymentAdminService;
    @Autowired private PosQrVentaService                posQrVentaService;
    @Autowired private GuestCancelTokenService          guestCancelTokenService;
    @Autowired private com.hotclick.service.analytics.AtribucionPedidoService atribucionPedidoService;

    @Transactional
    public PaymentCheckoutResponse checkout(PaymentCheckoutRequest req, String correoUsuario) {
        checkoutValidator.validateCartNotEmpty(req);

        String provider = checkoutValidator.resolveProvider(req, providerFactory);
        String emailEfectivo = checkoutValidator.resolveEffectiveEmail(correoUsuario, req);
        Usuario usuario = guestUserResolver.resolve(emailEfectivo, req.getGuestPhone());

        Long bodegaId = req.getBodegaId() != null ? req.getBodegaId() : 1L;
        Bodega bodegaDefault = checkoutValidator.loadBodega(bodegaId);

        StockReservationResult reservation = stockReservationService.reserveForCheckout(req.getItems());
        CheckoutGrupoFactory.Grupo grupo = checkoutGrupoFactory.crear(
            req, reservation, bodegaDefault, provider, usuario, Constants.PEDIDO_PENDIENTE);
        Pedido principal = grupo.principal();
        atribucionPedidoService.guardarSiPresente(principal, req.getAtribucion());
        posQrVentaService.vincularPedidoTienda(req.getPosQrToken(), principal.getId());

        if (grupo.cubiertoPorGiftCard()) {
            for (CheckoutGrupoFactory.Subpedido s : grupo.subpedidos()) {
                Pedido pedido = s.pedido();
                stockReservationService.consumeForGiftCard(pedido);
                pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
                pedido.setMetodoPago("GIFT_CARD");
                pedidoRepository.save(pedido);
                if (s.pricing().gcMonto() > 0) {
                    giftCardService.canjear(s.pricing().gcCodigo(), pedido, s.pricing().gcMonto());
                }
                paymentNotificationsFacade.onGiftCardFullPayment(pedido, s.pricing().gcCodigo());
            }
            posQrVentaService.marcarPagadoPorPedidoTienda(principal.getId());
            return conCancelToken(new PaymentCheckoutResponse(principal.getId(), principal.getNumeroPedido(),
                null, "PAGADO", 0, "GIFT_CARD"), grupo);
        }

        PaymentSession session;
        try {
            session = providerFactory.get(provider)
                .crearSesion(CheckoutGrupoFactory.paraCobro(principal, grupo.totalCobro()), usuario);
        } catch (RuntimeException e) {
            grupo.pedidos().forEach(stockReservationService::liberarReservas);
            throw e;
        } catch (Exception e) {
            grupo.pedidos().forEach(stockReservationService::liberarReservas);
            throw new IntegracionExternaException(provider, IntegracionExternaException.Tipo.IO_ERROR,
                "Error iniciando sesión de pago: " + e.getMessage(), e);
        }

        paymentRecordFactory.createAndPersist(session, principal, usuario, provider, grupo.totalCobro());

        log.info("Checkout iniciado: provider={} pedido={} paquetes={} total={}",
            provider, principal.getNumeroPedido(), grupo.subpedidos().size(), grupo.totalCobro());

        grupo.pedidos().forEach(p -> paymentNotificationsFacade.onPedidoCreado(p, provider));

        if (session.modoEmbebido()) {
            return conCancelToken(PaymentCheckoutResponse.embebido(
                principal.getId(), principal.getNumeroPedido(),
                session.redirectUrl(), Constants.PAGO_PENDIENTE, grupo.totalCobro(), provider,
                session.sdkToken(), session.externalId()), grupo);
        }
        return conCancelToken(new PaymentCheckoutResponse(
            principal.getId(), principal.getNumeroPedido(),
            session.redirectUrl(), Constants.PAGO_PENDIENTE, grupo.totalCobro(), provider), grupo);
    }

    private PaymentCheckoutResponse conCancelToken(PaymentCheckoutResponse response, CheckoutGrupoFactory.Grupo grupo) {
        response.setCancelToken(guestCancelTokenService.emitir(response.getNumeroPedido()));
        response.setPaquetes(CheckoutGrupoFactory.resumen(grupo.pedidos()));
        return response;
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
        Pago pago = pedidoGrupoService.pagoDelGrupo(pedido)
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
    public void cancelarAnon(String numeroPedido, String cancelToken) {
        userCancellationService.cancelarAnon(numeroPedido, cancelToken);
    }

    public PaymentStatusResponse buildStatusResponse(Pago pago) {
        return paymentStatusAssembler.build(pago);
    }
}
