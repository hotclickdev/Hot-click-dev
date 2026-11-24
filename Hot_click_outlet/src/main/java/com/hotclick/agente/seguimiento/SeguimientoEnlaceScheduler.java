package com.hotclick.agente.seguimiento;

import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;

/** AG-12: cada 5 min revisa los enlaces que necesitan recordatorio. ShedLock evita que corra en dos pods a la vez. */
@Component
public class SeguimientoEnlaceScheduler {

    private final SeguimientoEnlaceService servicio;

    public SeguimientoEnlaceScheduler(SeguimientoEnlaceService servicio) {
        this.servicio = servicio;
    }

    @Scheduled(fixedDelayString = "${hotclick.agente.seguimiento.barrido-ms:300000}", initialDelay = 90_000)
    @SchedulerLock(name = "agente_enlace_recordatorios", lockAtMostFor = "PT10M", lockAtLeastFor = "PT30S")
    public void barrer() {
        servicio.barrer(LocalDateTime.now(Constants.ZONA_CR), Instant.now());
    }
}
