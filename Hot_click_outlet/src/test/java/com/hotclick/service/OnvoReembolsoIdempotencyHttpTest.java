package com.hotclick.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@DisplayName("ONVO POST /v1/refunds manda el header Idempotency-Key (HTTP mockeado)")
class OnvoReembolsoIdempotencyHttpTest {

    private static final String CLAVE_IDEM = String.join("-", "hc", "reembolso", "pago", "70", "123");

    private static final String API = "https://api.onvopay.com/v1";
    private OnvoService onvo;
    private MockRestServiceServer server;

    @BeforeEach
    void armar() {
        RestTemplate rt = new RestTemplate();
        server = MockRestServiceServer.bindTo(rt).build();
        onvo = new OnvoService(rt);
        ReflectionTestUtils.setField(onvo, "secretKey", String.join("-", "llave", "falsa", "de", "prueba"));
        onvo.init();
    }

    @Test
    void headerIdempotencyKey() {
        server.expect(requestTo(API + "/refunds"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Idempotency-Key", CLAVE_IDEM))
            .andExpect(jsonPath("$.paymentIntentId").value("pi_test_1"))
            .andRespond(withSuccess("{\"id\":\"rf_1\",\"status\":\"pending\"}", MediaType.APPLICATION_JSON));
        assertThat(onvo.crearReembolso("pi_test_1", "Reembolso pedido HC-7", CLAVE_IDEM).status())
            .isEqualTo("pending");
        server.verify();
    }
}
