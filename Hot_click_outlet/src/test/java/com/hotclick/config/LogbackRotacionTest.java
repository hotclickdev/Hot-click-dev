package com.hotclick.config;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * QA-CONC-6 / S1-65: un solo logback, solo consola (Docker rota la salida), perfil default|prod,
 * stack recortado a 12 líneas por causa con el enmascarado de LOG-1 (%exSeguro{12} = %rEx{12}).
 */
class LogbackRotacionTest {

    @Test
    void configuracionRecortaYEnmascara() throws Exception {
        try (var in = getClass().getResourceAsStream("/logback-spring.xml")) {
            String xml = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(xml)
                .contains("%msgSeguro").contains("%exSeguro{12}")
                .contains("ch.qos.logback.core.ConsoleAppender")
                .contains("<springProfile name=\"default | prod | production\">")
                .doesNotContain("%msg%n").doesNotContain("%ex{")
                .doesNotContain("RollingFileAppender");
        }
    }
}
