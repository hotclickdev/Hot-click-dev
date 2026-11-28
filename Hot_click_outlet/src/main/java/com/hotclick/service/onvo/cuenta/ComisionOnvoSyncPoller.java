package com.hotclick.service.onvo.cuenta;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/** Concilia la comisión de cada negocio con ONVO y cierra los enlaces de pago que ONVO ya pagó o expiró. */
@Component
@ConditionalOnProperty(name = "onvo.comision.poller.enabled", havingValue = "true", matchIfMissing = true)
public class ComisionOnvoSyncPoller {

    private final ComisionOnvoSyncService sync;
    private final EnlacePagoOnvoLotes enlaces;

    public ComisionOnvoSyncPoller(ComisionOnvoSyncService sync, EnlacePagoOnvoLotes enlaces) {
        this.sync = sync;
        this.enlaces = enlaces;
    }

    @Scheduled(fixedDelayString = "${onvo.comision.poller.intervalo-ms:600000}",
               initialDelayString = "${onvo.comision.poller.retraso-inicial-ms:180000}")
    @SchedulerLock(name = "onvo_comision_enlaces_poller", lockAtMostFor = "PT9M", lockAtLeastFor = "PT30S")
    public void ejecutar() {
        conciliarComisiones();
        enlaces.conciliar();
    }

    /**
     * Detecta cambios de plan, de situación fiscal o de aprobación (sin tocar esos servicios) y reintenta los
     * pendientes. Cada cuenta es una llamada a ONVO distinta, así que se sincroniza una a una, por páginas.
     */
    int conciliarComisiones() {
        int revisadas = 0;
        for (int pagina = 0; ; pagina++) {
            List<Long> ids = sync.empresasConCuenta(pagina);
            for (Long id : ids) {
                sync.sincronizarSeguro(id);
                revisadas++;
            }
            if (ids.size() < sync.lote()) break;
        }
        return revisadas;
    }
}
