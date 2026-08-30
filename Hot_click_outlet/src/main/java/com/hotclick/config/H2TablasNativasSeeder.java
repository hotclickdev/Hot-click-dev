package com.hotclick.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * Crea en H2 las tablas nativas que Flyway arma en Postgres y Hibernate no.
 * Sin esto, POST /api/auth/login responde 500 (join de permisos).
 */
@Component
@Profile("test")
@Order(1)
public class H2TablasNativasSeeder implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(H2TablasNativasSeeder.class);
    static final String SCRIPT = "db/h2/tablas-nativas-test.sql";

    private final DataSource dataSource;

    public H2TablasNativasSeeder(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource(SCRIPT));
        }
        LOG.info("H2: tablas nativas listas ({})", SCRIPT);
    }
}
