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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

@DisplayName("ONVO SINPE POS: método mobile_number y cancelación (HTTP mockeado)")
class OnvoSinpePosHttpTest {

    private static final String API = "https://api.onvopay.com/v1";
    private static final String IDENT = "1-1111-1111-1"; // placeholder evidente
    private OnvoService onvo;
    private MockRestServiceServer server;

    @BeforeEach
    void armar() {
        RestTemplate rt = new RestTemplate();
        server = MockRestServiceServer.bindTo(rt).build();
        onvo = new OnvoService(rt);
        ReflectionTestUtils.setField(onvo, "secretKey", "onvo_live_LLAVE_FALSA_PRUEBA");
        onvo.init();
    }

    @Test
    @DisplayName("Método SINPE POS: identificación y tipo del pagador, sin número de teléfono")
    void metodoPosConIdentificacionYTipo() {
        server.expect(requestTo(API + "/payment-methods"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.type").value("mobile_number"))
            .andExpect(jsonPath("$.mobileNumber.identification").value(IDENT))
            .andExpect(jsonPath("$.mobileNumber.identificationType").value(1))
            .andExpect(jsonPath("$.mobileNumber.number").doesNotExist())
            .andExpect(jsonPath("$.billing.name").value("Cliente"))
            .andRespond(withSuccess("{\"id\":\"pm_1\"}", MediaType.APPLICATION_JSON));

        assertThat(onvo.crearMetodoPagoSinpePos(IDENT, 1, null).id()).isEqualTo("pm_1");
        server.verify();
    }

    @Test
    @DisplayName("Identificación corta o tipo fuera de 1–4: no llama a ONVO")
    void validaAntesDeLlamar() {
        assertThatThrownBy(() -> onvo.crearMetodoPagoSinpePos("1-111-111", 1, null))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> onvo.crearMetodoPagoSinpePos(IDENT, 5, null))
            .isInstanceOf(IllegalArgumentException.class);
        server.verify();
    }

    @Test
    @DisplayName("Cancelar devuelve el status de ONVO")
    void cancelarDevuelveStatus() {
        server.expect(requestTo(API + "/payment-intents/pi_1/cancel"))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withSuccess("{\"id\":\"pi_1\",\"status\":\"canceled\"}", MediaType.APPLICATION_JSON));
        assertThat(onvo.cancelarPaymentIntent("pi_1")).isEqualTo("canceled");
        server.verify();
    }

    @Test
    @DisplayName("Cancelar con error de ONVO devuelve vacío (no se da por cancelado)")
    void cancelarConErrorVacio() {
        server.expect(requestTo(API + "/payment-intents/pi_1/cancel"))
            .andRespond(withBadRequest().body("{\"message\":\"already succeeded\"}").contentType(MediaType.APPLICATION_JSON));
        assertThat(onvo.cancelarPaymentIntent("pi_1")).isEmpty();
    }

    @Test
    @DisplayName("Tipos de identificación válidos: 1 física, 2 jurídica, 3 DIMEX, 4 NITE")
    void tiposValidos() {
        assertThat(OnvoService.tipoIdentificacionValido(1)).isTrue();
        assertThat(OnvoService.tipoIdentificacionValido(4)).isTrue();
        assertThat(OnvoService.tipoIdentificacionValido(0)).isFalse();
        assertThat(OnvoService.tipoIdentificacionValido(null)).isFalse();
        assertThat(OnvoService.identificacionSinpeValida(IDENT)).isTrue();
    }
}
