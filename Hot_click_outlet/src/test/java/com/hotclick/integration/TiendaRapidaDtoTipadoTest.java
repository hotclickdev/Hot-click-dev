package com.hotclick.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** P2-02: el alta pública de tienda rápida recibe un DTO tipado con topes de tamaño. */
class TiendaRapidaDtoTipadoTest extends BaseIntegrationTest {

    @Test
    void campoGigante_400() throws Exception {
        mockMvc.perform(post("/api/public/tienda-rapida/token-x")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"acepto\":true,\"persona\":\"" + "a".repeat(5000) + "\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void tipoIncorrecto_400() throws Exception {
        mockMvc.perform(post("/api/public/tienda-rapida/token-x")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"acepto\":{\"x\":1},\"persona\":[\"a\"]}"))
            .andExpect(status().isBadRequest());
    }
}
