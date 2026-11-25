package com.hotclick.agente.catalogo;

import com.hotclick.rag.event.ProductoGuardadoEvent;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Dispara la sincronización con Meta: al guardar un producto (evento existente {@link ProductoGuardadoEvent}, después
 * del COMMIT y en otro hilo) y con un barrido diario. Un fallo aquí nunca afecta al guardado del producto.
 */
@Component
public class CatalogoMetaEventos {

    private static final Logger log = LoggerFactory.getLogger(CatalogoMetaEventos.class);

    private final CatalogoMetaService servicio;

    public CatalogoMetaEventos(CatalogoMetaService servicio) {
        this.servicio = servicio;
    }

    // Solo después del COMMIT: un guardado con rollback no sube nada. fallbackExecution cubre publicaciones sin transacción.
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    @Async("taskExecutor")
    public void alGuardarProducto(ProductoGuardadoEvent ev) {
        try {
            servicio.sincronizarProducto(ev.getEmpresaId(), ev.getProductoId());
        } catch (RuntimeException e) {
            log.warn("[catalogo-meta] no se pudo sincronizar el producto {}: {}", ev.getProductoId(), e.getClass().getSimpleName());
        }
    }

    /** 4:30 a. m. (hora de Costa Rica), después del indexado de embeddings. ShedLock: un solo pod. */
    @Scheduled(cron = "0 30 4 * * *", zone = "America/Costa_Rica")
    @SchedulerLock(name = "agente_catalogo_barrido", lockAtMostFor = "PT2H", lockAtLeastFor = "PT5M")
    public void barridoDiario() {
        for (Long empresaId : servicio.empresasConCatalogo()) {
            try {
                servicio.barrer(empresaId);
            } catch (RuntimeException e) {
                log.warn("[catalogo-meta] barrido fallido empresa={}: {}", empresaId, e.getClass().getSimpleName());
            }
        }
    }
}
