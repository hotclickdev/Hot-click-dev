package com.hotclick.scheduler;

import com.hotclick.service.analytics.MetaAdsInsightsSyncService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Baja insights de Meta (gasto, impresiones, frecuencia) una vez al día.
 */
@Component
public class MetaAdsInsightsScheduler {

    private static final Logger log = LoggerFactory.getLogger(MetaAdsInsightsScheduler.class);

    private final MetaAdsInsightsSyncService syncService;

    public MetaAdsInsightsScheduler(MetaAdsInsightsSyncService syncService) {
        this.syncService = syncService;
    }

    @Scheduled(cron = "0 15 6 * * *", zone = "America/Costa_Rica")
    @SchedulerLock(name = "meta_ads_insights_sync", lockAtMostFor = "PT30M", lockAtLeastFor = "PT5M")
    public void syncDiario() {
        if (!syncService.isEnabled()) return;
        int n = syncService.syncAyer();
        log.info("[meta-insights] job diario filas={}", n);
    }
}
