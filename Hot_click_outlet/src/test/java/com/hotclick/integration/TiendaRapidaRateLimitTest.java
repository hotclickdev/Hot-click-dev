package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST publico de tienda rapida: tope de 5 por minuto por IP (el 11 sigue dando 429). */
@DisplayName("Tienda rapida publica: rate limit por IP")
class TiendaRapidaRateLimitTest extends BaseIntegrationTest {

    @Test
    void onceavoIntento_429() throws Exception {
        String url = "/api/public/tienda-rapida/tokenInexistente_abcdefghijklmnop";
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().is4xxClientError());
        }
        mockMvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isTooManyRequests());
    }
}