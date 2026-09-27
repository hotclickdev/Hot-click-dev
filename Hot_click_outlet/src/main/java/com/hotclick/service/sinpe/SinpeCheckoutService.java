package com.hotclick.service.sinpe;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PagoRepository;
import com.hotclick.service.analytics.AtribucionPedidoService;
import com.hotclick.service.payment.CheckoutValidator;
import com.hotclick.service.payment.CompraCheckoutResult;
import com.hotclick.service.payment.CompraCheckoutService;
import com.hotclick.service.payment.CompraGiftCardService;
import com.hotclick.service.payment.GuestCancelTokenService;
import com.hotclick.service.payment.GuestUserResolver;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Checkout SINPE / efectivo: misma compra por paquetes que la tarjeta, pero los
 * pedidos quedan esperando el comprobante y el pago no expira por TTL.
 */
@Service
public class SinpeCheckoutService {

    private static final Logger log = LoggerFactory.getLogger(SinpeCheckoutService.class);

    @Autowired private CheckoutValidator       checkoutValidator;
    @Autowired private GuestUserResolver       guestUserResolver;
    @Autowired private CompraCheckoutService   compraCheckoutService;
    @Autowired private CompraGiftCardService   compraGiftCardService;
    @Autowired private PagoRepository          pagoRepository;
    @Autowired private GuestCancelTokenService guestCancelTokenService;
    @Autowired private AtribucionPedidoService atribucionPedidoService;

    @Transactional
    public PaymentCheckoutResponse checkout(PaymentCheckoutRequest req, String correoUsuario) {
        checkoutValidator.validateCartNotEmpty(req);
        String emailEfectivo = checkoutValidator.resolveEffectiveEmail(correoUsuario, req);
        Usuario usuario = guestUserResolver.resolve(emailEfectivo, req.getGuestPhone());
        String proveedorEfectivo = req.getProvider() != null ? req.getProvider() : Constants.PROVEEDOR_SINPE;

        CompraCheckoutResult compra = compraCheckoutService.crear(
            req, usuario, proveedorEfectivo, Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        Pedido pedido = compra.principal();
        atribucionPedidoService.guardarSiPresente(pedido, req.getAtribucion());

        if (compraGiftCardService.liquidarSiCubreTodo(compra)) {
            return conCancelToken(new PaymentCheckoutResponse(pedido.getId(), pedido.getNumeroPedido(),
                null, "PAGADO", 0, "GIFT_CARD"));
        }

        int total = compra.totalSinGiftCard();
        guardarPagoSinpe(pedido, usuario, total);
        log.info("Checkout {} iniciado: compra={} paquetes={} total={}",
            proveedorEfectivo, pedido.getNumeroPedido(), compra.pedidos().size(), total);

        return conCancelToken(new PaymentCheckoutResponse(
            pedido.getId(), pedido.getNumeroPedido(),
            null, Constants.PAGO_PENDIENTE, total, proveedorEfectivo));
    }

    /** SINPE es manual: sin fechaExpiracion; el cleanup TTL excluye proveedor SINPE. */
    private void guardarPagoSinpe(Pedido pedido, Usuario usuario, int total) {
        Pago pago = new Pago();
        pago.setMerchantToken("SINPE-" + UUID.randomUUID());
        pago.setMonto(total);
        pago.setMoneda("CRC");
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setProveedor(Constants.PROVEEDOR_SINPE);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pago.setPedido(pedido);
        pago.setCompra(pedido.getCompra());
        pago.setUsuario(usuario);
        pago.setEstado(Constants.ESTADO_ACTIVO);
        pagoRepository.save(pago);
    }

    private PaymentCheckoutResponse conCancelToken(PaymentCheckoutResponse response) {
        response.setCancelToken(guestCancelTokenService.emitir(response.getNumeroPedido()));
        return response;
    }
}
