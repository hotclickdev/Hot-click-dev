package com.hotclick.service.facturacion;

import com.hotclick.service.FacturacionService;
import com.hotclick.service.payment.CompraPagadaEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class TiqueteCompraListener {

    private static final Logger log = LoggerFactory.getLogger(TiqueteCompraListener.class);

    private final FacturacionService facturacionService;

    public TiqueteCompraListener(FacturacionService facturacionService) {
        this.facturacionService = facturacionService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alConfirmarCompra(CompraPagadaEvent event) {
        try {
            facturacionService.emitirTiqueteDeCompra(event.compraId());
        } catch (Exception e) {
            log.error("[facturacion] No se pudo emitir el tiquete de la compra {}: {}",
                event.compraId(), e.getMessage());
        }
    }
}
