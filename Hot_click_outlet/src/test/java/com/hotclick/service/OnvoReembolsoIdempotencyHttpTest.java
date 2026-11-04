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
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

@DisplayName("ONVO POST /v1/refunds: sin header Idempotency-Key no documentado; 4xx loguea motivo enmascarado (HTTP mockeado)")
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
    void sinHeaderIdempotencyKey() {
        server.expect(requestTo(API + "/refunds"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(headerDoesNotExist("Idempotency-Key"))
            .andExpect(jsonPath("$.paymentIntentId").value("pi_test_1"))
            .andRespond(withSuccess("{\"id\":\"rf_1\",\"status\":\"pending\"}", MediaType.APPLICATION_JSON));
        assertThat(onvo.crearReembolso("pi_test_1", "Reembolso pedido HC-7", CLAVE_IDEM).status())
            .isEqualTo("pending");
        server.verify();
    }

    @Test
    void cuatroCientosRelanzaYMotivoEnmascarado() {
        String intent = "pi_" + "abcd" + "1234567890" + "wxyz";
        server.expect(requestTo(API + "/refunds"))
            .andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
                .body("{\"statusCode\":400,\"message\":[\"Payment intent " + intent + " cannot be refunded\",\"tel 8" + "8887777\"],\"error\":\"Bad Request\"}"));
        HttpClientErrorException e = assertThrows(HttpClientErrorException.class,
            () -> onvo.crearReembolso("pi_test_1", "Reembolso pedido HC-7", CLAVE_IDEM));
        String motivo = OnvoService.motivoOnvo(e.getResponseBodyAsString());
        assertThat(motivo).contains("cannot be refunded").doesNotContain(intent).doesNotContain("88887777").contains("***");
        assertThat(OnvoService.motivoOnvo(null)).isEqualTo("(sin detalle)");
        assertThat(OnvoService.motivoOnvo("<html>boom</html>")).isEqualTo("(sin detalle)");
    }

    @Test
    void motivoOnvoOcultaCorreos() {
        String correo = "cliente.prueba+x" + "@" + "ejemplo.test";
        String motivo = OnvoService.motivoOnvo("{\"message\":[\"customer " + correo + " not allowed\"]}");
        assertThat(motivo).doesNotContain("cliente").doesNotContain("ejemplo").contains("not allowed").contains("***");
    }
}
