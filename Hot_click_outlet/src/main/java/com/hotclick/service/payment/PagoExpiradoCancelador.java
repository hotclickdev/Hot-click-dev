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
    /** AG-08: opcional (las pruebas unitarias no lo traen); se inyecta por setter. */
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setEventPublisher(org.springframework.context.ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

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
        return cerrar(pagoId, Constants.PAGO_CANCELADO, "por expiración de pago TTL", false);
    }

    /**
     * QA5 MEDIO (pago rechazado): ONVO confirmó por GET que el cobro fue rechazado y la sesión quedó expirada
     * y sin cobro. El pago pasa a FALLIDO, el pedido a CANCELADO y su stock reservado se libera.
     * Idempotente: con la fila del pago bloqueada solo el primero que lo ve PENDIENTE libera; el resto devuelve false.
     */
    @Transactional
    public boolean marcarFallido(Long pagoId) {
        return cerrar(pagoId, Constants.PAGO_FALLIDO, "por pago rechazado en ONVO", true);
    }

    private boolean cerrar(Long pagoId, String estadoPago, String motivo, boolean rechazado) {
        Pago pago = pagoRepository.findByIdForUpdate(pagoId).orElse(null);
        if (pago == null || !Constants.PAGO_PENDIENTE.equals(pago.getEstadoPago())) {
            return false;
        }
        pago.setEstadoPago(estadoPago);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));

        // fix2: orden Pago (ya bloqueado) → pedidos del grupo FOR UPDATE ORDER BY id → productos en UN lock ordenado.
        // El TTL solo cancela PEDIDO_PENDIENTE (sin PENDIENTE_COMPROBANTE/APROBACION). Sin catch: un fallo revierte todo.
        List<Pedido> pedidosActualizados = pedidoGrupoService.bloquearGrupo(pago.getPedido()).stream()
            .filter(p -> Constants.PEDIDO_PENDIENTE.equals(p.getEstadoPedido()))
            .toList();
        stockReservationService.liberarReservasDeGrupoBloqueado(
            pedidosActualizados.stream().filter(p -> p.getStockReservadoEn() != null).toList());
        for (Pedido pedido : pedidosActualizados) {
            pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
            log.info("Pedido {} cancelado {}", pedido.getNumeroPedido(), motivo);
            // AG-08: rechazo real de un pedido del bot (el vencimiento por TTL no avisa como rechazo).
            if (rechazado) com.hotclick.agente.pago.PedidoBotEventos.publicarRechazado(pedido, eventPublisher);
        }
        pagoRepository.saveAll(List.of(pago));
        pedidoRepository.saveAll(pedidosActualizados);
        return true;
    }
}
