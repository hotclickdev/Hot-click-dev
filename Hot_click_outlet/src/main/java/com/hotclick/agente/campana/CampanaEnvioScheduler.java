package com.hotclick.agente.campana;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** AG-36: cada minuto procesa un lote de envíos de campañas EN_CURSO. ShedLock evita que corra en dos pods a la vez. */
@Component
public class CampanaEnvioScheduler {

    private final CampanaEnvioService servicio;

    public CampanaEnvioScheduler(CampanaEnvioService servicio) {
        this.servicio = servicio;
    }

    @Scheduled(fixedDelayString = "${hotclick.agente.campana.barrido-ms:60000}", initialDelay = 120_000)
    @SchedulerLock(name = "agente_campana_envios", lockAtMostFor = "PT10M", lockAtLeastFor = "PT20S")
    public void barrer() {
        servicio.procesarLote();
    }
}
