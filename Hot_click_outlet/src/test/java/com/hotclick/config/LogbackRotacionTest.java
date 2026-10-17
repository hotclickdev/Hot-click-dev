package com.hotclick.config;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/** QA-CONC-6: stack recortado y archivo con rotación y tope de tamaño. */
class LogbackRotacionTest {

    @Test
    void configuracionRecortaYRota() throws Exception {
        try (var in = getClass().getResourceAsStream("/logback-spring.xml")) {
            String xml = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(xml).contains("%ex{30}").contains("SizeAndTimeBasedRollingPolicy")
                .contains("<maxFileSize>10MB</maxFileSize>").contains("<totalSizeCap>200MB</totalSizeCap>");
        }
    }
}
