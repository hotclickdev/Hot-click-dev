package com.hotclick.scheduler;

import com.hotclick.service.suscripcion.TrialEmprendedorService;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/** Cierre diario de los trials Emprendedor vencidos sin cobro. ShedLock: una sola ejecución en multi-pod. */
@Component
public class TrialEmprendedorScheduler {

    private static final Logger log = LoggerFactory.getLogger(TrialEmprendedorScheduler.class);

    private final TrialEmprendedorService service;

    public TrialEmprendedorScheduler(TrialEmprendedorService service) {
        this.service = service;
    }

    @Scheduled(cron = "${hotclick.trial-emprendedor.cierre-cron:0 30 3 * * *}", zone = "America/Costa_Rica")
    @SchedulerLock(name = "trial_emprendedor_cierre", lockAtMostFor = "PT20M", lockAtLeastFor = "PT1M")
    public void cerrarTrialsVencidos() {
        int n = service.cerrarTrialsVencidos(LocalDate.now(Constants.ZONA_CR));
        if (n > 0) log.info("[trial-emprendedor] {} trial(s) vencido(s) cerrado(s)", n);
    }
}
