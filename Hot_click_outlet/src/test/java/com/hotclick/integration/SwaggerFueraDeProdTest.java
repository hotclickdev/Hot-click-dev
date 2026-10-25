package com.hotclick.integration;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/** Fuera de prod (perfil test, sin application-prod) /v3/api-docs sigue disponible. */
class SwaggerFueraDeProdTest extends BaseIntegrationTest {

    @Test
    void apiDocsDisponible() throws Exception {
        int status = mockMvc.perform(get("/v3/api-docs").header("Authorization", userToken))
            .andReturn().getResponse().getStatus();
        assertThat(status).isEqualTo(200);
    }
}
