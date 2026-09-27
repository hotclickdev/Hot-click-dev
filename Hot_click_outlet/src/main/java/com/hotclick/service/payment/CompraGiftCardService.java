package com.hotclick.service.payment;

import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.GiftCardService;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/** Cierra en el acto una compra que las tarjetas de regalo cubren por completo. */
@Service
public class CompraGiftCardService {

    @Autowired private StockReservationService    stockReservationService;
    @Autowired private PedidoRepository           pedidoRepository;
    @Autowired private GiftCardService            giftCardService;
    @Autowired private PaymentNotificationsFacade paymentNotificationsFacade;
    @Autowired private PosQrVentaService          posQrVentaService;

    public boolean liquidarSiCubreTodo(CompraCheckoutResult compra) {
        if (!compra.pagadaConGiftCard()) return false;
        for (int i = 0; i < compra.pedidos().size(); i++) {
            liquidarPaquete(compra.pedidos().get(i), compra.precios().get(i));
        }
        return true;
    }

    private void liquidarPaquete(Pedido pedido, OrderPricingResult pricing) {
        stockReservationService.consumeForGiftCard(pedido);
        pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
        pedido.setMetodoPago("GIFT_CARD");
        pedidoRepository.save(pedido);
        if (pricing.gcMonto() > 0) {
            giftCardService.canjear(pricing.gcCodigo(), pedido, pricing.gcMonto());
        }
        paymentNotificationsFacade.onGiftCardFullPayment(pedido, pricing.gcCodigo());
        posQrVentaService.marcarPagadoPorPedidoTienda(pedido.getId());
    }
}
