package com.hotclick.sse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Puente entre el evento de dominio (cambio de stock_actual) y el registro SSE.
 * AFTER_COMMIT garantiza que solo se notifique stock ya persistido (nunca un
 * valor que termine en rollback). @Async libera el hilo HTTP del caller.
 */
@Component
public class StockChangeListener {

    private static final Logger log = LoggerFactory.getLogger(StockChangeListener.class);

    private final StockSseRegistry registry;

    public StockChangeListener(StockSseRegistry registry) {
        this.registry = registry;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStockCambio(StockCambioEvent event) {
        if (event.getEmpresaId() == null) {
            log.warn("StockCambioEvent ignorado — empresaId null para productoId={}", event.getProductoId());
            return;
        }
        registry.broadcast(event.getEmpresaId(), event.getProductoId(), event.getStockActual());
    }
}
