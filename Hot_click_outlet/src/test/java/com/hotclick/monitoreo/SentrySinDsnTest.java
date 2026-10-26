package com.hotclick.monitoreo;

import io.sentry.Sentry;
import io.sentry.spring.boot.jakarta.SentryAutoConfiguration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.io.InputStream;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Sentry es opcional: sin SENTRY_DSN no se inicializa y nunca manda PII por defecto.
 */
class SentrySinDsnTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(SentryAutoConfiguration.class));

    @AfterEach
    void cerrar() {
        Sentry.close();
    }

    @Test
    void sinPropiedadDsnNoSeInicializa() {
        runner.run(ctx -> {
            assertThat(ctx).hasNotFailed();
            assertThat(Sentry.isEnabled()).isFalse();
        });
    }

    @Test
    void conDsnVacioNoSeInicializa() {
        runner.withPropertyValues("sentry.dsn=").run(ctx -> {
            assertThat(ctx).hasNotFailed();
            assertThat(Sentry.isEnabled()).isFalse();
        });
    }

    @Test
    void applicationPropertiesTomaDsnDeVariableYApagaPii() throws Exception {
        Properties p = new Properties();
        try (InputStream in = getClass().getResourceAsStream("/application.properties")) {
            p.load(in);
        }
        assertThat(p.getProperty("sentry.dsn")).isEqualTo("${SENTRY_DSN:}");
        assertThat(p.getProperty("sentry.send-default-pii")).isEqualTo("false");
    }
}
