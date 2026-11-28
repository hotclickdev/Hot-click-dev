package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Map;

/**
 * Corre todos los días a las 00:20 (hora de Costa Rica): genera los registros de la quincena que acaba de cerrar y
 * marca VENCIDA lo que pasó el plazo. El 1 y el 16 son los días en que cierra una quincena; los demás días la
 * generación no crea nada (es idempotente) y sirve de reintento si el servidor estuvo caído el 1 o el 16.
 */
@Component
public class FacturaNegocioJob {

    private static final Logger log = LoggerFactory.getLogger(FacturaNegocioJob.class);

    private final FacturaNegocioGeneracionService generacion;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public FacturaNegocioJob(FacturaNegocioGeneracionService generacion) {
        this(generacion, Clock.system(Constants.ZONA_CR));
    }

    FacturaNegocioJob(FacturaNegocioGeneracionService generacion, Clock clock) {
        this.generacion = generacion;
        this.clock = clock;
    }

    /** ShedLock solo envuelve métodos void. */
    @Scheduled(cron = "0 20 0 * * *", zone = "America/Costa_Rica")
    @SchedulerLock(name = "factura-negocio-quincena", lockAtMostFor = "PT30M", lockAtLeastFor = "PT1M")
    public void ejecutarProgramado() {
        ejecutar();
    }

    public void ejecutar() {
        LocalDate hoy = LocalDate.now(clock);
        Map<String, Object> r = generacion.generar(FacturaNegocioCalculo.quincenaCerrada(hoy));
        int vencidas = generacion.vencer(hoy);
        log.info("[factura-negocio] quincena {}..{} creadas={} vencidas={}", r.get("desde"), r.get("hasta"),
            r.get("creadas"), vencidas);
    }
}
