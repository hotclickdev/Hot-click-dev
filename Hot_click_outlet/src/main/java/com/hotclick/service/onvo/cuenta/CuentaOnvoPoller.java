package com.hotclick.service.onvo.cuenta;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** ONVO no manda webhook de estado de cuentas conectadas: se consulta por polling. */
@Component
@ConditionalOnProperty(name = "onvo.cuentas.poller.enabled", havingValue = "true", matchIfMissing = true)
public class CuentaOnvoPoller {

    private final CuentaOnvoService service;

    public CuentaOnvoPoller(CuentaOnvoService service) { this.service = service; }

    /** Opcional: seguimiento de cuentas perdidas (alta por fases). Corre bajo el mismo lock del poller. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.hotclick.service.alta.AltaFasesSeguimientoService seguimiento;

    @Scheduled(fixedDelayString = "${onvo.cuentas.poller.intervalo-ms:600000}",
               initialDelayString = "${onvo.cuentas.poller.retraso-inicial-ms:120000}")
    @SchedulerLock(name = "onvo_cuentas_conectadas_poller", lockAtMostFor = "PT9M", lockAtLeastFor = "PT30S")
    public void ejecutar() {
        service.ciclo();
        if (seguimiento != null) seguimiento.ciclo();
    }
}
