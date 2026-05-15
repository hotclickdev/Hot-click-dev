package com.hotclick.scheduler;

import com.hotclick.repository.ProductoRepository;
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

    // Corre a las 3 AM todos los días
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void ocultarProductosAgotadosViejos() {
        LocalDateTime hace3Meses = LocalDateTime.now().minusMonths(3);
        int actualizados = productoRepository.inactivarProductosAgotadosAntesDe(hace3Meses);
        if (actualizados > 0) {
            log.info("Scheduler: {} producto(s) agotado(s) hace más de 3 meses marcados como inactivos", actualizados);
        }
    }
}
