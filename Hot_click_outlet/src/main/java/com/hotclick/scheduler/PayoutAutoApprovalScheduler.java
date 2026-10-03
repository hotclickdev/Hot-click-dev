package com.hotclick.scheduler;
import com.hotclick.utils.Constants;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Los retiros no se aprueban solos. Quedan en PENDIENTE hasta que finanzas los revise.
 * El umbral {@link Constants#UMBRAL_AUTO_APROBACION_PAYOUT} se conserva; no se usa para aprobar.
 */
@Component
public class PayoutAutoApprovalScheduler {

    private static final Logger log = LoggerFactory.getLogger(PayoutAutoApprovalScheduler.class);

    @Scheduled(cron = "0 */15 * * * *")
    @SchedulerLock(name = "payout_auto_approval", lockAtMostFor = "PT10M", lockAtLeastFor = "PT1M")
    public void autoAprobarPayoutsPequenos() {
        log.info("[payout-auto] Auto-aprobación deshabilitada. El umbral ₡{} no aprueba retiros; quedan PENDIENTE.",
                Constants.UMBRAL_AUTO_APROBACION_PAYOUT);
    }
}
