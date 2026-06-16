package com.hotclick.scheduler;

import com.hotclick.service.FacturacionContingenciaService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Reintenta cada 5 minutos los comprobantes que agotaron sus reintentos
 * rápidos en FacturacionService y quedaron en la cola de contingencia
 * (hot_click_cola_facturacion_offline_tb) esperando a que Hacienda se
 * restablezca.
 *
 * @SchedulerLock evita que dos pods (Render con 2+ instancias) ejecuten el
 * job en simultáneo. Como capa adicional, ColaFacturacionOfflineRepository
 * reclama las filas con FOR UPDATE SKIP LOCKED, así que aunque el lock de
 * ShedLock expirara mientras un pod aún sigue corriendo (lockAtMostFor),
 * dos ejecuciones jamás reenviarían el mismo comprobante dos veces.
 */
@Component
public class FacturacionContingenciaScheduler {

    private static final Logger log = LoggerFactory.getLogger(FacturacionContingenciaScheduler.class);

    private final FacturacionContingenciaService contingenciaService;

    public FacturacionContingenciaScheduler(FacturacionContingenciaService contingenciaService) {
        this.contingenciaService = contingenciaService;
    }

    @Scheduled(cron = "0 */5 * * * *")
    @SchedulerLock(name = "procesarColaFacturacionOffline", lockAtMostFor = "4m", lockAtLeastFor = "1m")
    public void procesarColaFacturacionOffline() {
        try {
            contingenciaService.procesarPendientes();
        } catch (Exception e) {
            log.error("[contingencia] error en ciclo de procesamiento: {}", e.getMessage());
        }
    }
}
