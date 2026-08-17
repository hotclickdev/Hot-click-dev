package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class PaymentFailureHandler {

    private static final Logger log = LoggerFactory.getLogger(PaymentFailureHandler.class);

    @Autowired private PagoRepository             pagoRepository;
    @Autowired private PedidoRepository           pedidoRepository;
    @Autowired private StockReservationService    stockReservationService;
    @Autowired private PaymentNotificationsFacade paymentNotificationsFacade;

    @Transactional
    public void marcarFallido(Pago pago, String motivo) {
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) return; // ya confirmado, no revertir

        pago.setEstadoPago(Constants.PAGO_FALLIDO);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);

        Pedido pedido = pago.getPedido();
        if (Constants.PEDIDO_PENDIENTE.equals(pedido.getEstadoPedido())) {
            pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
            pedidoRepository.save(pedido);
        }

        stockReservationService.liberarReservas(pedido);
        paymentNotificationsFacade.onPagoFallido(pedido, motivo);
        log.info("Pago {} marcado FALLIDO: {}", pago.getPedido().getNumeroPedido(), motivo);
    }
}
