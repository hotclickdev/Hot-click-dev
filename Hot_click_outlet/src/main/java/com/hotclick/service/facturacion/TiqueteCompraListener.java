package com.hotclick.service.facturacion;

import com.hotclick.service.FacturacionService;
import com.hotclick.service.payment.CompraPagadaEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.hotclick.service.hacienda.HaciendaLogSanitizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class TiqueteCompraListener {

    private static final Logger log = LoggerFactory.getLogger(TiqueteCompraListener.class);

    private final FacturacionService facturacionService;
    /** Área 7 N2: la emisión automática queda detrás de un interruptor apagado por defecto. */
    private final boolean emisionAutomatica;

    public TiqueteCompraListener(FacturacionService facturacionService,
                                 @Value("${hacienda.emision-automatica:false}") boolean emisionAutomatica) {
        this.facturacionService = facturacionService;
        this.emisionAutomatica = emisionAutomatica;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alConfirmarCompra(CompraPagadaEvent event) {
        if (!emisionAutomatica) return;
        try {
            facturacionService.emitirTiqueteDeCompra(event.compraId());
        } catch (Exception e) {
            log.error("[facturacion] No se pudo emitir el tiquete de la compra {}: {}",
                event.compraId(), HaciendaLogSanitizer.error(e));
        }
    }
}
