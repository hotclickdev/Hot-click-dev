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
 * Una sola vez al arrancar (no test): vacía tiendas, usuarios y productos
 * y deja admin + 3 QA. DataSeeder corre después y crea las cuentas QA si faltan.
 */
@Component
@Profile("!test")
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
        var resultado = resetPlataformaKeepQaService.ejecutarSiPendiente();
        LOG.warn("Vaciado plataforma: {}", resultado);
    }
}
