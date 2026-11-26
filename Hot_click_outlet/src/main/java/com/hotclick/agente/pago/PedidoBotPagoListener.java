package com.hotclick.agente.pago;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Escucha el pago de un pedido del bot DESPUÉS del COMMIT y en otro hilo: el webhook del proveedor responde sin
 * esperar a Meta, y un fallo del aviso nunca revierte ni retrasa el cobro.
 */
@Component
public class PedidoBotPagoListener {

    private static final Logger log = LoggerFactory.getLogger(PedidoBotPagoListener.class);

    private final AvisoPagoBotService servicio;

    public PedidoBotPagoListener(AvisoPagoBotService servicio) {
        this.servicio = servicio;
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alPagar(PedidoBotPagadoEvent ev) {
        try {
            servicio.alPagar(ev);
        } catch (RuntimeException ex) {
            log.error("[agente-pago] fallo al avisar el pago: {}", ex.getClass().getSimpleName());
        }
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alRechazar(PedidoBotRechazadoEvent ev) {
        try {
            servicio.alRechazar(ev);
        } catch (RuntimeException ex) {
            log.error("[agente-pago] fallo al avisar el rechazo: {}", ex.getClass().getSimpleName());
        }
    }
}
