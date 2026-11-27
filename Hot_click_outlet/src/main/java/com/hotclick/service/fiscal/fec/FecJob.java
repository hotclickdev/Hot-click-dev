package com.hotclick.service.fiscal.fec;

import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Los días 1 y 16 genera las FEC de la quincena que acaba de cerrar y envía las pendientes. Con régimen
 * SIMPLIFICADO o {@code fec_habilitada} apagada, FecService y FecEnvioService no hacen nada.
 */
@Component
public class FecJob {

    private static final Logger log = LoggerFactory.getLogger(FecJob.class);

    private final FecService fecService;
    private final FecEnvioService envio;

    public FecJob(FecService fecService, FecEnvioService envio) {
        this.fecService = fecService;
        this.envio = envio;
    }

    @Scheduled(cron = "${hotclick.fec.cron:0 30 4 1,16 * *}", zone = "America/Costa_Rica")
    @SchedulerLock(name = "fec-quincena", lockAtMostFor = "PT30M", lockAtLeastFor = "PT5M")
    public void programado() {
        ejecutar(LocalDate.now(Constants.ZONA_CR));
    }

    /** Separado para probarlo con una fecha fija. */
    void ejecutar(LocalDate hoy) {
        try {
            var reporte = fecService.generar(FecPeriodo.anteriorA(hoy));
            if (!reporte.activa()) {
                log.info("[fec-job] {}", reporte.mensaje());
                return;
            }
            envio.procesar();
        } catch (RuntimeException e) {
            log.error("[fec-job] falló la corrida: {}", e.getClass().getSimpleName());
        }
    }
}
