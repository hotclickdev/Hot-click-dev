package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * QA5 ALTO (bloqueo cleanup): cancela UN pago vencido en su propia transacción corta.
 * Quien llama (PaymentExpirationCleanupService) no tiene transacción, así que entre un pago y otro
 * no queda ningún FOR UPDATE de producto tomado. Antes la limpieza entera era una sola transacción:
 * liberaba el stock del pago 1 (FOR UPDATE del producto) y al verificar el pago 2 en ONVO la captura
 * (REQUIRES_NEW) esperaba ese mismo lock en otra conexión → auto-bloqueo que Postgres no detecta.
 * Orden de locks igual que la captura: primero la fila del pago, después los productos.
 */
@Service
public class PagoExpiradoCancelador {

    private static final Logger log = LoggerFactory.getLogger(PagoExpiradoCancelador.class);

    private final PagoRepository pagoRepository;
    private final PedidoRepository pedidoRepository;
    private final StockReservationService stockReservationService;
    private final PedidoGrupoService pedidoGrupoService;

    public PagoExpiradoCancelador(PagoRepository pagoRepository, PedidoRepository pedidoRepository,
                                  StockReservationService stockReservationService,
                                  PedidoGrupoService pedidoGrupoService) {
        this.pagoRepository = pagoRepository;
        this.pedidoRepository = pedidoRepository;
        this.stockReservationService = stockReservationService;
        this.pedidoGrupoService = pedidoGrupoService;
    }

    /** true si lo canceló; false si ya no estaba PENDIENTE (otra entrega lo capturó mientras tanto). */
    @Transactional
    public boolean cancelar(Long pagoId) {
        Pago pago = pagoRepository.findByIdForUpdate(pagoId).orElse(null);
        if (pago == null || !Constants.PAGO_PENDIENTE.equals(pago.getEstadoPago())) {
            return false;
        }
        pago.setEstadoPago(Constants.PAGO_CANCELADO);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));

        List<Pedido> pedidosActualizados = new ArrayList<>();
        for (Pedido pedido : pedidoGrupoService.delGrupo(pago.getPedido())) {
            if (Constants.PEDIDO_PENDIENTE.equals(pedido.getEstadoPedido())) {
                pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
                pedidosActualizados.add(pedido);
                stockReservationService.liberarReservas(pedido);
                log.info("Pedido {} cancelado por expiración de pago TTL", pedido.getNumeroPedido());
            }
        }
        pagoRepository.saveAll(List.of(pago));
        pedidoRepository.saveAll(pedidosActualizados);
        return true;
    }
}
