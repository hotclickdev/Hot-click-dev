package com.hotclick.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

/** QA7-C1: en el perfil dev el retorno de pago iba a :8080 (backend) y no a la SPA, y no se podía sobreescribir. */
class AppUrlPerfilDevTest {

    @Test
    @DisplayName("app.url de dev se toma de APP_URL y por defecto apunta al front (:3000), no al backend (:8080)")
    void appUrlDevUsaAppUrlYElFront() throws Exception {
        Properties p = new Properties();
        try (var in = getClass().getResourceAsStream("/application-dev.properties")) {
            p.load(in);
        }
        assertThat(p.getProperty("app.url")).isEqualTo("${APP_URL:http://localhost:3000}");
        assertThat(p.getProperty("app.url")).doesNotContain(":8080");
    }
}
