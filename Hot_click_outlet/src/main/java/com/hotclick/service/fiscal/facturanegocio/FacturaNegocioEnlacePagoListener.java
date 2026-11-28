package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.service.onvo.cuenta.EnlacePagoOnvoLotes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Al aprobarse la factura de un negocio, cancela los enlaces de pago único de ONVO abiertos atados a ESA factura.
 * Después del commit y fuera del hilo del request: son llamadas a ONVO. Nunca hace fallar la recepción.
 */
@Component
public class FacturaNegocioEnlacePagoListener {

    private static final Logger log = LoggerFactory.getLogger(FacturaNegocioEnlacePagoListener.class);

    private final EnlacePagoOnvoLotes enlaces;

    public FacturaNegocioEnlacePagoListener(EnlacePagoOnvoLotes enlaces) { this.enlaces = enlaces; }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void alRecibir(FacturaNegocioRecibidaEvent evento) {
        if (evento == null || evento.empresaId() == null || evento.facturaId() == null) return;
        try {
            int cancelados = enlaces.alRecibirFactura(evento.empresaId(), evento.facturaId());
            if (cancelados > 0) log.info("[factura-negocio] empresa={} enlaces de cobro cancelados={}", evento.empresaId(), cancelados);
        } catch (RuntimeException e) {
            log.warn("[factura-negocio] no se pudieron cancelar los enlaces de la empresa {}: {}",
                evento.empresaId(), e.getClass().getSimpleName());
        }
    }
}
