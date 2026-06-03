package com.hotclick.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Llama repair() antes de migrate() para que Flyway actualice el checksum
 * de migraciones FAILED cuyo script fue corregido (idempotencia añadida).
 */
@Configuration
public class FlywayRepairConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayRepairConfig.class);

    @Bean
    public FlywayMigrationStrategy repairThenMigrate() {
        return flyway -> {
            log.info("[flyway] Ejecutando repair() para sincronizar checksums de migraciones fallidas...");
            flyway.repair();
            log.info("[flyway] repair() completado. Iniciando migrate()...");
            flyway.migrate();
        };
    }
}
