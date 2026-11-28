package com.hotclick.scheduler;

import com.hotclick.service.contador.ContadorAvisosService;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/** Cada manana crea los avisos del Contador IA para los vencimientos de los proximos 3 dias. */
@Component
public class ContadorAvisosJob {

    private static final Logger log = LoggerFactory.getLogger(ContadorAvisosJob.class);

    private final ContadorAvisosService avisos;

    public ContadorAvisosJob(ContadorAvisosService avisos) { this.avisos = avisos; }

    @Scheduled(cron = "0 0 7 * * *", zone = "America/Costa_Rica")
    @SchedulerLock(name = "contador_avisos_vencimientos", lockAtMostFor = "PT10M", lockAtLeastFor = "PT1M")
    public void generar() {
        try {
            avisos.generar(LocalDate.now(Constants.ZONA_CR));
        } catch (RuntimeException e) {
            log.warn("[contador] no se pudieron generar los avisos: {}", e.getClass().getSimpleName());
        }
    }
}
