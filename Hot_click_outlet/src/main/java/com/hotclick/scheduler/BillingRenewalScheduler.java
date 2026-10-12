package com.hotclick.scheduler;

import com.hotclick.service.SuscripcionService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Job diario de billing:
 * - Expira trials vencidos → degrada empresa a FREE
 * - Expira PAST_DUE con fecha_fin pasada → degrada empresa a FREE
 *
 * ShedLock garantiza ejecución única en multi-pod (Render).
 * Corre a las 3:00 AM — después de DataRetentionScheduler (2:30 AM).
 */
@Component
public class BillingRenewalScheduler {

    private static final Logger log = LoggerFactory.getLogger(BillingRenewalScheduler.class);

    private final SuscripcionService suscripcionService;

    private final com.hotclick.service.suscripcion.RenovacionesTilopayService tilopayBilling;

    public BillingRenewalScheduler(SuscripcionService suscripcionService,
                                   com.hotclick.service.suscripcion.RenovacionesTilopayService tilopayBilling) {
        this.suscripcionService = suscripcionService;
        this.tilopayBilling = tilopayBilling;
    }

    @Scheduled(cron = "0 0 3 * * *")
    @SchedulerLock(name = "billing_renewal", lockAtMostFor = "PT30M", lockAtLeastFor = "PT5M")
    public void procesarRenovaciones() {
        long inicio = System.currentTimeMillis();

        // Mensualidades Tilopay: abre cobro y marca PAST_DUE a las vencidas (gracia la aplica expirarPastDue).
        tilopayBilling.generarRenovaciones(java.time.LocalDate.now(com.hotclick.utils.Constants.ZONA_CR));
        int trialsExpirados = suscripcionService.expirarTrialsVencidos();
        int pastDueExpirados = suscripcionService.expirarPastDueVencidos();

        int total = trialsExpirados + pastDueExpirados;
        if (total > 0) {
            log.info("[billing-renewal] {} trial(s) + {} PAST_DUE expirados en {}ms",
                trialsExpirados, pastDueExpirados, System.currentTimeMillis() - inicio);
        }
    }
}
