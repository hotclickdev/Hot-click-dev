package com.hotclick.scheduler;

import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.InventoryForecastService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Daily job that recalculates ABC classification + demand averages for all
 * active empresas. Runs at 04:00 AM with ShedLock to prevent double execution
 * on multi-pod Render deployments.
 */
@Component
public class AbcAnalysisScheduler {

    private static final Logger log = LoggerFactory.getLogger(AbcAnalysisScheduler.class);

    @Autowired private EmpresaRepository        empresaRepository;
    @Autowired private InventoryForecastService forecastService;

    @Scheduled(cron = "0 0 4 * * *")
    @SchedulerLock(name = "abc_analysis", lockAtMostFor = "PT2H", lockAtLeastFor = "PT5M")
    public void ejecutar() {
        log.info("[ABC] Iniciando análisis ABC diario...");
        int total = 0;
        long cursor = 0L;
        while (true) {
            List<Long> ids = empresaRepository.findIdsByEstadoAfterCursor(
                "ACTIVO", cursor, PageRequest.of(0, 50));
            if (ids.isEmpty()) break;
            for (Long id : ids) {
                try {
                    forecastService.actualizarAnalisisEmpresa(id);
                    total++;
                } catch (Exception ex) {
                    log.error("[ABC] Error empresa={}: {}", id, ex.getMessage());
                }
            }
            cursor = ids.get(ids.size() - 1);
        }
        log.info("[ABC] Análisis ABC completado — {} empresas procesadas", total);
    }
}
