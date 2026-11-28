package com.hotclick.service.onvo.cuenta;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Concilia la comisión de cada negocio con ONVO y cierra los enlaces de pago que ONVO ya pagó o expiró. */
@Component
@ConditionalOnProperty(name = "onvo.comision.poller.enabled", havingValue = "true", matchIfMissing = true)
public class ComisionOnvoSyncPoller {

    private final ComisionOnvoSyncService sync;
    private final EnlacePagoOnvoService enlaces;

    public ComisionOnvoSyncPoller(ComisionOnvoSyncService sync, EnlacePagoOnvoService enlaces) {
        this.sync = sync;
        this.enlaces = enlaces;
    }

    @Scheduled(fixedDelayString = "${onvo.comision.poller.intervalo-ms:600000}",
               initialDelayString = "${onvo.comision.poller.retraso-inicial-ms:180000}")
    @SchedulerLock(name = "onvo_comision_enlaces_poller", lockAtMostFor = "PT9M", lockAtLeastFor = "PT30S")
    public void ejecutar() {
        sync.conciliar();
        enlaces.conciliar();
    }
}
