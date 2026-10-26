package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Re-QA Infra (BAJO): Stripe retirado del checkout público; sin webhook ni hosts en la CSP. */
@DisplayName("Stripe retirado: webhook 404 y CSP sin stripe")
class StripeRetiradoTest extends BaseIntegrationTest {

    @Test
    @DisplayName("POST /api/webhooks/stripe → 404")
    void webhookStripeNoExiste() throws Exception {
        mockMvc.perform(post("/api/webhooks/stripe")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Stripe-Signature", "t=1,v1=x")
                .content("{\"id\":\"evt_x\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("La CSP no permite hosts de Stripe")
    void cspSinStripe() throws Exception {
        String csp = mockMvc.perform(get("/api/health")).andReturn().getResponse()
            .getHeader("Content-Security-Policy");
        assertThat(csp).isNotNull().doesNotContain("stripe");
    }
}
