package com.hotclick.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("H2TablasNativasSeeder")
class H2TablasNativasSeederTest {

    @Test
    @DisplayName("el SQL de tablas nativas está en el classpath")
    void scriptEnClasspath() {
        assertThat(new ClassPathResource(H2TablasNativasSeeder.SCRIPT).exists()).isTrue();
    }
}
