package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.CuponService;
import com.hotclick.service.EncargoService;
import com.hotclick.service.GiftCardService;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.utils.Constants;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentOrderConfirmationService {

    private static final Logger log = LoggerFactory.getLogger(PaymentOrderConfirmationService.class);

    @Autowired private PedidoRepository           pedidoRepository;
    @Autowired private CuponService               cuponService;
    @Autowired private GiftCardService            giftCardService;
    @Autowired private StockReservationService    stockReservationService;
    @Autowired private PaymentNotificationsFacade paymentNotificationsFacade;
    @Autowired private PosQrVentaService          posQrVentaService;
    @Autowired @Lazy private EncargoService       encargoService;

    @Transactional
    public void confirmarPedido(Pago pago, Object paymentServiceSelf, ApplicationEventPublisher eventPublisher) {
        Pedido pedido = pago.getPedido();
        Hibernate.initialize(pedido.getItems());

        // Verificar que no esté ya confirmado (idempotencia)
        if (Constants.PEDIDO_PAGADO.equals(pedido.getEstadoPedido())) {
            log.info("confirmarPedido ignorado — pedido {} ya está PAGADO", pedido.getNumeroPedido());
            return;
        }

        stockReservationService.confirmAndConsumeStock(pedido, paymentServiceSelf, eventPublisher);

        pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
        pedidoRepository.save(pedido);

        if (pedido.getCuponCodigo() != null) {
            if (pedido.getEmpresa() != null) {
                cuponService.marcarUsado(pedido.getCuponCodigo(), pedido.getEmpresa().getId());
            } else {
                cuponService.marcarUsado(pedido.getCuponCodigo());
            }
        }
        if (pedido.getGiftCardCodigo() != null && pedido.getGiftCardMonto() != null && pedido.getGiftCardMonto() > 0) {
            giftCardService.canjear(pedido.getGiftCardCodigo(), pedido, pedido.getGiftCardMonto());
        }
        encargoService.marcarPagadosPorPedido(pedido.getId());
        paymentNotificationsFacade.onPedidoConfirmado(pedido, pago);
        posQrVentaService.marcarPagadoPorPedidoTienda(pedido.getId());
    }
}
