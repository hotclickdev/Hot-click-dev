package com.hotclick.agente.comprobante;

import com.hotclick.service.facturacion.ComprobanteEmitidoEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * AG-34: escucha el evento EXISTENTE de comprobante emitido (no agrega otro) DESPUÉS del commit y en otro hilo: la
 * facturación no espera a Meta y un fallo del aviso nunca la afecta. La idempotencia vive en
 * {@link AvisoComprobanteService} (una sola vez por comprobante).
 */
@Component
public class ComprobanteBotListener {

    private static final Logger log = LoggerFactory.getLogger(ComprobanteBotListener.class);

    private final AvisoComprobanteService servicio;

    public ComprobanteBotListener(AvisoComprobanteService servicio) {
        this.servicio = servicio;
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void alEmitir(ComprobanteEmitidoEvent ev) {
        if (ev == null || ev.comprobanteId() == null) return;
        try {
            servicio.alEmitir(ev.comprobanteId());
        } catch (RuntimeException ex) {
            log.error("[agente-comprobante] fallo al avisar el comprobante: {}", ex.getClass().getSimpleName());
        }
    }
}
