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
    private static final String IDENT = "01-0000-0000"; // placeholder evidente
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
    @DisplayName("QA ALTO 1: el método SINPE manda number del comprador normalizado a +506########")
    void metodoConNumeroNormalizado() {
        server.expect(requestTo(API + "/payment-methods"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.type").value("mobile_number"))
            .andExpect(jsonPath("$.mobileNumber.identification").value(IDENT))
            .andExpect(jsonPath("$.mobileNumber.identificationType").value(0))
            .andExpect(jsonPath("$.mobileNumber.number").value("+50680000000"))
            .andExpect(jsonPath("$.billing.name").value("Cliente"))
            .andRespond(withSuccess("{\"id\":\"pm_1\"}", MediaType.APPLICATION_JSON));

        assertThat(onvo.crearMetodoPagoSinpePos(IDENT, 0, " 8000-0000 ", null).id()).isEqualTo("pm_1");
        server.verify();
    }

    @Test
    @DisplayName("Identificación, tipo o número inválidos: no llama a ONVO (fail-closed)")
    void validaAntesDeLlamar() {
        assertThatThrownBy(() -> onvo.crearMetodoPagoSinpePos("1-111-111", 0, "80000000", null))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> onvo.crearMetodoPagoSinpePos(IDENT, 6, "80000000", null))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> onvo.crearMetodoPagoSinpePos(IDENT, 0, null, null))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> onvo.crearMetodoPagoSinpePos(IDENT, 0, "8000000", null))
            .isInstanceOf(IllegalArgumentException.class);
        server.verify();
    }

    @Test
    @DisplayName("Normalización del número SINPE")
    void normalizaNumero() {
        assertThat(OnvoService.normalizarNumeroSinpe("80000000")).isEqualTo("+50680000000");
        assertThat(OnvoService.normalizarNumeroSinpe("+506 8000 0000")).isEqualTo("+50680000000");
        assertThat(OnvoService.normalizarNumeroSinpe("506-8000-0000")).isEqualTo("+50680000000");
        assertThat(OnvoService.normalizarNumeroSinpe("+50680000000")).hasSize(12);
        assertThat(OnvoService.normalizarNumeroSinpe("8000000")).isNull();
        assertThat(OnvoService.normalizarNumeroSinpe("800000000")).isNull();
        assertThat(OnvoService.normalizarNumeroSinpe("+1 8000 0000")).isNull();
        assertThat(OnvoService.normalizarNumeroSinpe("8000abcd")).isNull();
        assertThat(OnvoService.normalizarNumeroSinpe("")).isNull();
        assertThat(OnvoService.normalizarNumeroSinpe(null)).isNull();
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
    @DisplayName("QA ALTO 2: enum ONVO 0,1,2,3,4,5,9 con el formato de cada tipo")
    void tiposYFormatos() {
        assertThat(OnvoService.identificacionSinpeValida("01-0000-0000", 0)).isTrue();
        assertThat(OnvoService.identificacionSinpeValida("100000000000", 1)).isTrue();
        assertThat(OnvoService.identificacionSinpeValida("2-000-000000", 2)).isTrue();
        assertThat(OnvoService.identificacionSinpeValida("3-000-000000", 3)).isTrue();
        assertThat(OnvoService.identificacionSinpeValida("4-000-000000", 4)).isTrue();
        assertThat(OnvoService.identificacionSinpeValida("500000000000", 5)).isTrue();
        assertThat(OnvoService.identificacionSinpeValida("900000000000", 9)).isTrue();
        // formatos inválidos
        assertThat(OnvoService.identificacionSinpeValida("010000000", 0)).isFalse();
        assertThat(OnvoService.identificacionSinpeValida("1-0000-0000", 0)).isFalse();
        assertThat(OnvoService.identificacionSinpeValida("1-0000-00000", 1)).isFalse();
        assertThat(OnvoService.identificacionSinpeValida("1000000000000", 1)).isFalse();
        assertThat(OnvoService.identificacionSinpeValida("3-000-000000", 2)).isFalse();
        assertThat(OnvoService.identificacionSinpeValida("3000000000", 3)).isFalse();
        assertThat(OnvoService.identificacionSinpeValida("4-123-000000", 4)).isFalse();
        assertThat(OnvoService.identificacionSinpeValida("5-0000-000000", 5)).isFalse();
        assertThat(OnvoService.identificacionSinpeValida("90000000000", 9)).isFalse();
        assertThat(OnvoService.identificacionSinpeValida("01-0000-0000", 6)).isFalse();
        assertThat(OnvoService.identificacionSinpeValida("01-0000-0000", null)).isFalse();
        assertThat(OnvoService.identificacionSinpeValida(null, 0)).isFalse();
        for (int t : new int[]{0, 1, 2, 3, 4, 5, 9}) assertThat(OnvoService.tipoIdentificacionValido(t)).isTrue();
        assertThat(OnvoService.tipoIdentificacionValido(6)).isFalse();
        assertThat(OnvoService.tipoIdentificacionValido(null)).isFalse();
    }
}
