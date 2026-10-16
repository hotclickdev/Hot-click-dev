package com.hotclick.integration;

import com.hotclick.service.payment.OrderPricingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("QA-COM-006 | el frontend lee la tabla de envío del servidor")
class EnvioTarifasPublicTest extends BaseIntegrationTest {

    @Autowired private OrderPricingService pricing;

    @Test
    void sinSesionDevuelveLaMismaTablaQueCobraElServidor() throws Exception {
        var r = mockMvc.perform(get("/api/public/envio/tarifas")).andExpect(status().isOk());
        for (String m : OrderPricingService.METODOS_ENVIO) {
            r.andExpect(jsonPath("$." + m).value(pricing.calcularCostoEnvio(m)));
        }
    }
}
