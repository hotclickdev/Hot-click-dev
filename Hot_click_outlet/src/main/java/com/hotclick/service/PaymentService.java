package com.hotclick.service;

import java.util.List;
import com.hotclick.service.payment.CheckoutValidator;
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
    @Autowired private PosQrVentaService                posQrVentaService;
    @Autowired private GuestCancelTokenService          guestCancelTokenService;
    @Autowired private com.hotclick.service.payment.ReservaAntiBotService reservaAntiBot;
    @Autowired private com.hotclick.service.analytics.AtribucionPedidoService atribucionPedidoService;
    /** AG-07: enlace de compra del bot (libera su reserva antes de reservar para el pedido y vincula pedido ↔ enlace). */
    @Autowired(required = false) private com.hotclick.agente.enlace.EnlaceCompraVinculo enlaceCompraVinculo;

    @Transactional
    public PaymentCheckoutResponse checkout(PaymentCheckoutRequest req, String correoUsuario) {
        checkoutValidator.validateCartNotEmpty(req);
        CheckoutValidator.exigirDireccionSiHayEnvio(req);
        // AG-07/AG-09: libera la reserva del enlace del bot (el pedido reserva la suya) y completa el teléfono.
        Long enlaceCompraId = enlaceCompraVinculo == null ? null : enlaceCompraVinculo.preparar(req).orElse(null);

        String provider = checkoutValidator.resolveProvider(req, providerFactory);
        String emailEfectivo = checkoutValidator.resolveEffectiveEmail(correoUsuario, req);
        Usuario usuario = guestUserResolver.resolve(emailEfectivo, req.getGuestPhone());

        Bodega bodegaDefault = checkoutValidator.resolverBodegaDefault(req.getBodegaId());

        StockReservationResult reservation = stockReservationService.reserveForCheckout(req.getItems());
        CheckoutGrupoFactory.Grupo grupo = checkoutGrupoFactory.crear(
            req, reservation, bodegaDefault, provider, usuario, Constants.PEDIDO_PENDIENTE);
        Pedido principal = grupo.principal();
        if (enlaceCompraId != null) enlaceCompraVinculo.vincular(enlaceCompraId, grupo.pedidos());
        atribucionPedidoService.guardarSiPresente(principal, req.getAtribucion());
        posQrVentaService.vincularPedidoTienda(req.getPosQrToken(), principal.getId());

        if (grupo.cubiertoPorGiftCard()) {
            for (CheckoutGrupoFactory.Subpedido s : grupo.subpedidos()) {
                Pedido pedido = s.pedido();
                stockReservationService.consumeForGiftCard(pedido);
                pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
                pedido.setMetodoPago("GIFT_CARD");
                pedidoRepository.save(pedido);
                com.hotclick.agente.pago.PedidoBotEventos.publicarPagado(pedido, eventPublisher);
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
            liberarGrupoTrasFalloDeSesion(grupo.pedidos(), e);
            throw e;
        } catch (Exception e) {
            IntegracionExternaException ie = new IntegracionExternaException(provider,
                IntegracionExternaException.Tipo.IO_ERROR, "Error iniciando sesión de pago: " + e.getMessage(), e);
            liberarGrupoTrasFalloDeSesion(grupo.pedidos(), ie);
            throw ie;
        }

        Pago pago = paymentRecordFactory.createAndPersist(session, principal, usuario, provider, grupo.totalCobro());
        reservaAntiBot.registrar(usuario, esInvitado(correoUsuario), req, grupo.pedidos(), pago);

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

    private static boolean esInvitado(String correoUsuario) {
        return correoUsuario == null || "anonymousUser".equals(correoUsuario);
    }

    private PaymentCheckoutResponse conCancelToken(PaymentCheckoutResponse response, CheckoutGrupoFactory.Grupo grupo) {
        response.setCancelToken(guestCancelTokenService.emitir(response.getNumeroPedido()));
        response.setPaquetes(CheckoutGrupoFactory.resumen(grupo.pedidos()));
        return response;
    }

    @Transactional
    public PaymentOrderConfirmationService.Resultado confirmarPedido(Pago pago) {
        return orderConfirmationService.confirmarPedido(pago, this, eventPublisher);
    }

    /** F1: consume la reserva de un pedido de tienda cobrado a mano sin Pago previo (idempotente). */
    public void consumirReservaPagoManual(Pedido pedido) {
        orderConfirmationService.consumirReservaPagoManual(pedido, this, eventPublisher);
    }

    /** Chequeo de sobreventa para un pago manual registrado sin Pago previo (no confirma). */
    public boolean revisarSobreventa(Pago pago) {
        return orderConfirmationService.revisarSobreventa(pago);
    }

    /**
     * fix2: libera la reserva de UN pedido por el camino seguro (pedido FOR UPDATE → un lock de productos ordenado,
     * sin catch por línea). Sin llamadores en main; se conserva por compatibilidad.
     */
    @Transactional
    public void liberarReservas(Pedido pedido) {
        if (pedido == null) return;
        liberarBloqueando(List.of(pedido));
    }

    /**
     * fix2: el Pago todavía no existe (o ya no importa): bloquea los pedidos FOR UPDATE ORDER BY id y libera las
     * reservas de todos en un solo lock de productos. Sin catch: un fallo revierte la transacción del llamador.
     */
    private void liberarBloqueando(List<Pedido> pedidos) {
        List<Pedido> bloqueados = pedidoGrupoService.bloquearPedidos(pedidos);
        stockReservationService.liberarReservasDeGrupoBloqueado(
            bloqueados.stream().filter(p -> p.getStockReservadoEn() != null).toList());
    }

    /** El fallo de la sesión de pago es el error que se informa; si liberar también falla, queda como suprimido. */
    private void liberarGrupoTrasFalloDeSesion(List<Pedido> pedidos, Exception causa) {
        try {
            liberarBloqueando(pedidos);
        } catch (RuntimeException liberacion) {
            causa.addSuppressed(liberacion);
        }
    }

    // fix2: la cancelación pendiente guarda la intención; el wrapper no la revierte (mismo noRollbackFor que el servicio).
    @Transactional(noRollbackFor = com.hotclick.service.payment.CancelacionPendienteOnvoException.class)
    public void cancelarPorUsuario(String numeroPedido, String correoUsuario) {
        userCancellationService.cancelarPorUsuario(numeroPedido, correoUsuario);
    }

    @Transactional(readOnly = true)
    public PaymentStatusResponse consultarEstado(String numeroPedido) {
        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Pedido no encontrado", "pedido=" + RecursoNoEncontradoException.enmascarar(numeroPedido)));
        Pago pago = pedidoGrupoService.pagoDelGrupo(pedido)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Pago no encontrado", "pago del pedido=" + RecursoNoEncontradoException.enmascarar(numeroPedido)));
        return buildStatusResponse(pago);
    }

    @Transactional
    public void marcarFallido(Pago pago, String motivo) {
        paymentFailureHandler.marcarFallido(pago, motivo);
    }

    @Transactional(noRollbackFor = com.hotclick.service.payment.CancelacionPendienteOnvoException.class)
    public void cancelarAnon(String numeroPedido, String cancelToken) {
        userCancellationService.cancelarAnon(numeroPedido, cancelToken);
    }

    public PaymentStatusResponse buildStatusResponse(Pago pago) {
        return paymentStatusAssembler.build(pago);
    }
}
