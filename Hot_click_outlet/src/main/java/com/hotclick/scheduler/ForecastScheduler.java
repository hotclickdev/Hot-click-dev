package com.hotclick.scheduler;

import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.DemandForecastService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Daily demand forecast generation for all active empresas.
 * Runs at 04:30 AM (30 min after ABC analysis) with ShedLock.
 */
@Component
public class ForecastScheduler {

    private static final Logger log = LoggerFactory.getLogger(ForecastScheduler.class);

    @Autowired private EmpresaRepository     empresaRepository;
    @Autowired private DemandForecastService forecastService;

    @Scheduled(cron = "0 30 4 * * *")
    @SchedulerLock(name = "demand_forecast", lockAtMostFor = "PT2H", lockAtLeastFor = "PT5M")
    public void ejecutar() {
        log.info("[Forecast] Iniciando pronósticos diarios...");
        int total = 0;
        long cursor = 0L;
        while (true) {
            List<Long> ids = empresaRepository.findIdsByEstadoAfterCursor(
                "ACTIVO", cursor, PageRequest.of(0, 50));
            if (ids.isEmpty()) break;
            for (Long id : ids) {
                try {
                    forecastService.generarForecast(id);
                    total++;
                } catch (Exception ex) {
                    log.error("[Forecast] Error empresa={}: {}", id, ex.getMessage());
                }
            }
            cursor = ids.get(ids.size() - 1);
        }
        log.info("[Forecast] Pronósticos completados — {} empresas procesadas", total);
    }
}
