package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** SEC-02: /api/stock sin sesion o con rol comprador no entra. */
@DisplayName("[SEC-02] /api/stock: anonimo 401, comprador 403")
class StockSeguridadIntegrationTest extends BaseIntegrationTest {

    @Test
    void anonimo_401() throws Exception {
        mockMvc.perform(get("/api/stock/movimientos/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/stock/ajuste-entrada/1")
                .contentType(MediaType.APPLICATION_JSON).content("{\"cantidad\":5}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void comprador_403() throws Exception {
        mockMvc.perform(get("/api/stock/movimientos/1").header("Authorization", userToken))
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/stock/ajuste-entrada/1").header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"cantidad\":5}"))
            .andExpect(status().isForbidden());
    }
}
