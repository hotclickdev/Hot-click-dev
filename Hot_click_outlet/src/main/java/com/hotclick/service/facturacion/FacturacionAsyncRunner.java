package com.hotclick.service.facturacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Envía el comprobante en otro hilo, DESPUÉS del commit que lo creó. Es un bean aparte para que
 * el proxy de @Async aplique (la auto-invocación dentro de FacturacionService lo saltaba y el envío
 * corría síncrono dentro de la transacción del checkout).
 */
@Component
public class FacturacionAsyncRunner {

    private static final Logger log = LoggerFactory.getLogger(FacturacionAsyncRunner.class);

    private final FacturacionEnvioProcessor envioProcessor;

    public FacturacionAsyncRunner(FacturacionEnvioProcessor envioProcessor) {
        this.envioProcessor = envioProcessor;
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void alEmitir(ComprobanteEmitidoEvent event) {
        try {
            envioProcessor.procesarComprobante(event.comprobanteId());
        } catch (Exception e) {
            log.error("[facturacion] Error procesando async comprobante={}: {}", event.comprobanteId(), e.getMessage());
        }
    }
}
