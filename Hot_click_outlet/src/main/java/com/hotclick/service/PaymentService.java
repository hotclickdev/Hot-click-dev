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
    @Autowired private ApplicationEventPublisher        eventPublisher;

    @Autowired private CheckoutValidator                checkoutValidator;
    @Autowired private GuestUserResolver                guestUserResolver;
    @Autowired private StockReservationService          stockReservationService;
    @Autowired private CompraCheckoutService            compraCheckoutService;
    @Autowired private CompraGiftCardService            compraGiftCardService;
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

        CompraCheckoutResult compra = compraCheckoutService.crear(req, usuario, provider, Constants.PEDIDO_PENDIENTE);
        Pedido pedido = compra.principal();
        atribucionPedidoService.guardarSiPresente(pedido, req.getAtribucion());
        posQrVentaService.vincularPedidoTienda(req.getPosQrToken(), pedido.getId());

        if (compraGiftCardService.liquidarSiCubreTodo(compra)) {
            return conCancelToken(new PaymentCheckoutResponse(pedido.getId(), pedido.getNumeroPedido(),
                null, "PAGADO", 0, "GIFT_CARD"));
        }

        PaymentSession session = abrirSesion(provider, compra, usuario);
        int total = compra.totalSinGiftCard();
        paymentRecordFactory.createAndPersist(session, pedido, usuario, provider, total);

        log.info("Checkout iniciado: provider={} compra={} paquetes={} total={}",
            provider, pedido.getNumeroPedido(), compra.pedidos().size(), total);

        compra.pedidos().forEach(p -> paymentNotificationsFacade.onPedidoCreado(p, provider));

        if (session.modoEmbebido()) {
            return conCancelToken(PaymentCheckoutResponse.embebido(
                pedido.getId(), pedido.getNumeroPedido(),
                session.redirectUrl(), Constants.PAGO_PENDIENTE, total, provider,
                session.sdkToken(), session.externalId()));
        }
        return conCancelToken(new PaymentCheckoutResponse(
            pedido.getId(), pedido.getNumeroPedido(),
            session.redirectUrl(), Constants.PAGO_PENDIENTE, total, provider));
    }

    private PaymentSession abrirSesion(String provider, CompraCheckoutResult compra, Usuario usuario) {
        try {
            return providerFactory.get(provider).crearSesion(pedidoACobrar(compra), usuario);
        } catch (RuntimeException e) {
            compra.pedidos().forEach(stockReservationService::liberarReservas);
            throw e;
        } catch (Exception e) {
            compra.pedidos().forEach(stockReservationService::liberarReservas);
            throw new IntegracionExternaException(provider, IntegracionExternaException.Tipo.IO_ERROR,
                "Error iniciando sesión de pago: " + e.getMessage(), e);
        }
    }

    /**
     * La pasarela cobra un solo monto: con varios paquetes se le pasa una copia
     * no persistida del paquete 1 con el total de la compra.
     */
    static Pedido pedidoACobrar(CompraCheckoutResult compra) {
        Pedido principal = compra.principal();
        int totalCobro = compra.totalCobro();
        if (compra.pedidos().size() == 1) return principal;
        Pedido cobro = new Pedido();
        cobro.setId(principal.getId());
        cobro.setNumeroPedido(principal.getNumeroPedido());
        cobro.setTotalPedido(totalCobro);
        cobro.setUsuarioFinal(principal.getUsuarioFinal());
        cobro.setEmpresa(principal.getEmpresa());
        return cobro;
    }

    private PaymentCheckoutResponse conCancelToken(PaymentCheckoutResponse response) {
        response.setCancelToken(guestCancelTokenService.emitir(response.getNumeroPedido()));
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
        Pago pago = CompraPaquetes.pagoDe(pedido, pagoRepository)
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
