package com.hotclick.service.onvo.cuenta;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

@DisplayName("Cliente HTTP de cuentas conectadas ONVO — contrato openapi")
class OnvoCuentaConectadaHttpClientTest {

    private static final String KEY = "onvo_test_secret_key_dummy";

    @Test
    void creaConBusinessNameYLeeOnboardingUrl() {
        RestTemplate rt = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(rt).build();
        server.expect(requestTo("https://api.onvopay.com/v1/connected-accounts"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer " + KEY))
            .andExpect(jsonPath("$.businessName").value("Soda"))
            .andExpect(jsonPath("$.marketplaceAppFee").doesNotExist())
            .andRespond(withStatus(HttpStatus.CREATED).contentType(MediaType.APPLICATION_JSON).body(
                "{\"id\":\"cl_1\",\"mode\":\"test\",\"status\":\"pending_onboarding\",\"businessName\":\"Soda\","
                + "\"marketplaceAppFee\":0,\"createdAt\":\"2026-10-23T18:00:00.000Z\",\"onboardingUrl\":\"https://onvopay.com/setup/a\"}"));
        var r = new OnvoCuentaConectadaHttpClient(rt, KEY).crear("Soda");
        assertThat(r.id()).isEqualTo("cl_1");
        assertThat(r.onboardingUrl()).isEqualTo("https://onvopay.com/setup/a");
        server.verify();
    }

    @Test
    void consultaYRegenera() {
        RestTemplate rt = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(rt).build();
        server.expect(requestTo("https://api.onvopay.com/v1/connected-accounts/cl_1"))
            .andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess("{\"id\":\"cl_1\",\"status\":\"active\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api.onvopay.com/v1/connected-accounts/cl_1/onboarding-link"))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withStatus(HttpStatus.CONFLICT).contentType(MediaType.APPLICATION_JSON)
                .body("{\"statusCode\":409,\"code\":\"marketplaces.onboarding_already_completed\"}"));
        var c = new OnvoCuentaConectadaHttpClient(rt, KEY);
        assertThat(c.consultar("cl_1").status()).isEqualTo("active");
        assertThatThrownBy(() -> c.regenerarOnboarding("cl_1"))
            .isInstanceOf(OnvoCuentaConectadaClient.OnboardingCompletadoException.class);
        server.verify();
    }

    @Test
    void sinLlaveNoLlamaYFallaCerrado() {
        RestTemplate rt = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(rt).build();
        assertThatThrownBy(() -> new OnvoCuentaConectadaHttpClient(rt, "").crear("Soda"))
            .isInstanceOf(OnvoCuentaConectadaClient.OnvoNoConfiguradoException.class);
        server.verify();
    }
}
