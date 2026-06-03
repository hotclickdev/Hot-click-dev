package com.hotclick.scheduler;

import com.hotclick.repository.ProductoRepository;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class ProductoScheduler {

    private static final Logger log = LoggerFactory.getLogger(ProductoScheduler.class);

    @Autowired
    private ProductoRepository productoRepository;

    // Corre a las 3:30 AM — escalonado para no competir con BillingRenewal (3:00) y RefreshToken (3:15)
    @Scheduled(cron = "0 30 3 * * *")
    @SchedulerLock(name = "productos_inactivos", lockAtMostFor = "PT30M", lockAtLeastFor = "PT5M")
    @Transactional
    public void ocultarProductosAgotadosViejos() {
        LocalDateTime hace3Meses = LocalDateTime.now().minusMonths(3);
        int actualizados = productoRepository.inactivarProductosAgotadosAntesDe(hace3Meses);
        if (actualizados > 0) {
            log.info("Scheduler: {} producto(s) agotado(s) hace más de 3 meses marcados como inactivos", actualizados);
        }
    }
}
