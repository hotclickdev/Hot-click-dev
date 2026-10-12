package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("P4-02 | /api/encargos de gestión: comprador → 403")
class EncargoAdminRolTest extends BaseIntegrationTest {

    @Test
    void compradorNoUsaGestionDeEncargos() throws Exception {
        for (String url : new String[]{"/api/encargos", "/api/encargos/kpis", "/api/encargos/1/eventos"}) {
            mockMvc.perform(get(url).header("Authorization", userToken)).andExpect(status().isForbidden());
        }
        mockMvc.perform(put("/api/encargos/1/fulfillment").header("Authorization", userToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"estadoFulfillment\":\"ENVIADO\"}"))
            .andExpect(status().isForbidden());
    }
}
