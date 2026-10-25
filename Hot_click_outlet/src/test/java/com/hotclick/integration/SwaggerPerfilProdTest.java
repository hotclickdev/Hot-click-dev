package com.hotclick.integration;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Swagger UI y /v3/api-docs apagados con la config del perfil prod. Carga los mismos
 * application-prod.properties y application-production.properties del classpath (sin copiar valores)
 * sobre el perfil test, porque el perfil prod completo exige secretos y servicios reales.
 * Con usuario autenticado debe dar 404 (springdoc apagado, no el 401 de anyRequest().authenticated()).
 */
@TestPropertySource(locations = {"classpath:application-prod.properties", "classpath:application-production.properties"})
class SwaggerPerfilProdTest extends BaseIntegrationTest {

    @ParameterizedTest
    @ValueSource(strings = {"/v3/api-docs", "/v3/api-docs/swagger-config", "/swagger-ui/index.html", "/swagger-ui.html"})
    void autenticadoRecibe404(String ruta) throws Exception {
        int status = mockMvc.perform(get(ruta).header("Authorization", userToken))
            .andReturn().getResponse().getStatus();
        assertThat(status).as(ruta).isEqualTo(404);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/v3/api-docs", "/swagger-ui/index.html"})
    void anonimoNoAccede(String ruta) throws Exception {
        int status = mockMvc.perform(get(ruta)).andReturn().getResponse().getStatus();
        assertThat(status).as(ruta).isIn(401, 403, 404);
    }
}
