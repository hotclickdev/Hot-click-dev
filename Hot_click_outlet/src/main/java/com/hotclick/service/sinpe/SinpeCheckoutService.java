package com.hotclick.service.sinpe;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.Bodega;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PagoRepository;
import com.hotclick.service.payment.CheckoutGrupoFactory;
import com.hotclick.service.payment.CheckoutValidator;
import com.hotclick.service.payment.GuestCancelTokenService;
import com.hotclick.service.payment.GuestUserResolver;
import com.hotclick.service.payment.StockReservationResult;
import com.hotclick.service.payment.StockReservationService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Checkout SINPE: igual que el de tarjeta (un pago por grupo, un subpedido por bodega),
 * pero el Pago queda PENDIENTE hasta que el cliente sube el comprobante y un admin lo aprueba.
 */
@Service
public class SinpeCheckoutService {

    private static final Logger log = LoggerFactory.getLogger(SinpeCheckoutService.class);

    @Autowired private PagoRepository            pagoRepository;
    @Autowired private CheckoutValidator         checkoutValidator;
    @Autowired private GuestUserResolver         guestUserResolver;
    @Autowired private StockReservationService   stockReservationService;
    @Autowired private CheckoutGrupoFactory      checkoutGrupoFactory;
    @Autowired private GuestCancelTokenService   guestCancelTokenService;
    @Autowired private com.hotclick.service.payment.ReservaAntiBotService reservaAntiBot;
    @Autowired private com.hotclick.service.analytics.AtribucionPedidoService atribucionPedidoService;

    @Transactional
    public PaymentCheckoutResponse checkout(PaymentCheckoutRequest req, String correoUsuario) {
        checkoutValidator.validateCartNotEmpty(req);
        String emailEfectivo = checkoutValidator.resolveEffectiveEmail(correoUsuario, req);
        Usuario usuario = guestUserResolver.resolve(emailEfectivo, req.getGuestPhone());

        Long bodegaId = req.getBodegaId() != null ? req.getBodegaId() : 1L;
        Bodega bodegaDefault = checkoutValidator.loadBodega(bodegaId);

        StockReservationResult reservation = stockReservationService.reserveForCheckout(req.getItems());
        String proveedorEfectivo = req.getProvider() != null ? req.getProvider() : Constants.PROVEEDOR_SINPE;
        CheckoutGrupoFactory.Grupo grupo = checkoutGrupoFactory.crear(
            req, reservation, bodegaDefault, proveedorEfectivo, usuario, Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        Pedido principal = grupo.principal();
        atribucionPedidoService.guardarSiPresente(principal, req.getAtribucion());

        // SINPE es manual: no fechaExpiracion; el cleanup TTL excluye este proveedor.
        Pago pago = new Pago();
        pago.setMerchantToken("SINPE-" + UUID.randomUUID());
        pago.setMonto(grupo.totalCobro());
        pago.setMoneda("CRC");
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setProveedor(Constants.PROVEEDOR_SINPE);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pago.setPedido(principal);
        pago.setUsuario(usuario);
        pago.setEstado(Constants.ESTADO_ACTIVO);
        pago = pagoRepository.save(pago);
        boolean invitado = correoUsuario == null || "anonymousUser".equals(correoUsuario);
        reservaAntiBot.registrar(usuario, invitado, req, grupo.pedidos(), pago);

        log.info("Checkout {} iniciado: pedido={} paquetes={} total={}",
            proveedorEfectivo, principal.getNumeroPedido(), grupo.subpedidos().size(), grupo.totalCobro());

        PaymentCheckoutResponse response = new PaymentCheckoutResponse(
            principal.getId(), principal.getNumeroPedido(),
            null, Constants.PAGO_PENDIENTE, grupo.totalCobro(), proveedorEfectivo);
        response.setCancelToken(guestCancelTokenService.emitir(principal.getNumeroPedido()));
        response.setPaquetes(CheckoutGrupoFactory.resumen(grupo.pedidos()));
        return response;
    }
}
