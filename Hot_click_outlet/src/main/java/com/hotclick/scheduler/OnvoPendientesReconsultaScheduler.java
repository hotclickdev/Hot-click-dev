package com.hotclick.scheduler;

import com.hotclick.service.payment.OnvoPendientesReconsultaService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** QA5 MEDIO: respaldo del webhook ONVO. Una sola instancia a la vez (ShedLock, como billing_renewal). */
@Component
public class OnvoPendientesReconsultaScheduler {

    private final OnvoPendientesReconsultaService servicio;

    public OnvoPendientesReconsultaScheduler(OnvoPendientesReconsultaService servicio) {
        this.servicio = servicio;
    }

    @Scheduled(fixedDelayString = "${hotclick.pagos.onvo.respaldo.intervalo-ms}",
               initialDelayString = "${hotclick.pagos.onvo.respaldo.intervalo-ms}")
    @SchedulerLock(name = "onvo_pendientes_reconsulta", lockAtMostFor = "PT10M", lockAtLeastFor = "PT30S")
    public void ejecutar() {
        servicio.ejecutar();
    }
}
