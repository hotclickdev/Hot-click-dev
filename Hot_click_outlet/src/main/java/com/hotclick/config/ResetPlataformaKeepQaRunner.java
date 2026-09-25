package com.hotclick.config;

import com.hotclick.service.ResetPlataformaKeepQaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Al arrancar en dev: vacía tiendas y productos sobrantes y deja admin + 3 QA.
 * DataSeeder corre después y crea las 4 cuentas si faltan. Se reintenta si
 * quedaron tiendas/productos de una corrida anterior incompleta.
 * NUNCA activar fuera de dev — vacía datos reales de tiendas/productos.
 */
@Component
@Profile("dev")
@Order(90)
public class ResetPlataformaKeepQaRunner implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(ResetPlataformaKeepQaRunner.class);

    private final ResetPlataformaKeepQaService resetPlataformaKeepQaService;

    public ResetPlataformaKeepQaRunner(ResetPlataformaKeepQaService resetPlataformaKeepQaService) {
        this.resetPlataformaKeepQaService = resetPlataformaKeepQaService;
    }

    @Override
    public void run(ApplicationArguments args) {
        LOG.warn("Comprobando vaciado de plataforma (conserva admin + QA)…");
        try {
            var resultado = resetPlataformaKeepQaService.ejecutarSiPendiente();
            LOG.warn("Vaciado plataforma: {}", resultado);
        } catch (RuntimeException e) {
            // No debe tumbar el arranque de producción por un fallo en esta limpieza one-shot.
            LOG.error("Vaciado plataforma falló, se continúa el arranque sin aplicarlo: {}", e.getMessage(), e);
        }
    }
}
