package com.hotclick.agente.metricas;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Escucha la entrega de un pedido del bot DESPUÉS del COMMIT y en otro hilo: marcar el pedido como entregado nunca
 * espera a Meta ni se revierte por un fallo del mensaje de reseña.
 */
@Component
public class ResenaBotListener {

    private static final Logger log = LoggerFactory.getLogger(ResenaBotListener.class);

    private final ResenaBotService servicio;

    public ResenaBotListener(ResenaBotService servicio) {
        this.servicio = servicio;
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alEntregar(PedidoBotEntregadoEvent ev) {
        try {
            servicio.alEntregar(ev);
        } catch (RuntimeException ex) {
            log.error("[agente-resena] fallo al pedir la reseña: {}", ex.getClass().getSimpleName());
        }
    }
}
