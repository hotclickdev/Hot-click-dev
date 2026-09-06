package com.hotclick.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Checkout ONVO — error 400")
class OnvoServiceCheckoutErrorTest {

    @Mock RestTemplate restTemplate;
    OnvoService service;

    @BeforeEach
    void armar() {
        service = new OnvoService(restTemplate);
        ReflectionTestUtils.setField(service, "secretKey", "onvo_test_secret_key_abc");
        service.init();
    }

    @Test
    @DisplayName("400 de ONVO llega como IllegalStateException con el mensaje real")
    void badRequestPropagaMensajeOnvo() {
        when(restTemplate.exchange(anyString(), any(), any(), eq(Map.class)))
            .thenThrow(HttpClientErrorException.create(
                HttpStatus.BAD_REQUEST, "Bad Request", HttpHeaders.EMPTY,
                "{\"message\":\"customerEmail is required\"}".getBytes(StandardCharsets.UTF_8),
                StandardCharsets.UTF_8));

        assertThatThrownBy(() -> service.crearCheckoutSession(
            1201, "Caja x1", "https://hotclick.lat/ok", "https://hotclick.lat/ko",
            null, Map.of("origen", "POS")))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("customerEmail is required");
    }
}
