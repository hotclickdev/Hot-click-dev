package com.hotclick.service;

import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Errores ONVO")
class OnvoErrorSupportTest {

    @Test
    @DisplayName("Extrae message string del JSON de ONVO")
    void extraeMessageString() {
        assertThat(OnvoErrorSupport.extraerMensajeJson(
            "{\"statusCode\":400,\"message\":\"customerEmail is required\"}"))
            .isEqualTo("customerEmail is required");
    }

    @Test
    @DisplayName("Extrae el primer message si ONVO manda un array")
    void extraeMessageArray() {
        assertThat(OnvoErrorSupport.extraerMensajeJson(
            "{\"message\":[\"redirectUrl must be a valid URI\"]}"))
            .isEqualTo("redirectUrl must be a valid URI");
    }

    @Test
    @DisplayName("400 de ONVO no se disfraza de circuito abierto")
    void mensajeClienteUsaCuerpoOnvo() {
        HttpClientErrorException e = HttpClientErrorException.create(
            HttpStatus.BAD_REQUEST, "Bad Request", HttpHeaders.EMPTY,
            "{\"message\":\"customerEmail is required\"}".getBytes(StandardCharsets.UTF_8),
            StandardCharsets.UTF_8);
        assertThat(OnvoErrorSupport.mensajeCliente(e)).isEqualTo("customerEmail is required");
    }

    @Test
    @DisplayName("Circuito OPEN sí usa el mensaje genérico; un 400 se relanza")
    void relanzarDistingueCircuitoDeValidacion() {
        CircuitBreaker cb = CircuitBreaker.of("onvo-test", CircuitBreakerConfig.ofDefaults());
        CallNotPermittedException abierto = CallNotPermittedException.createCallNotPermittedException(cb);
        assertThat(OnvoErrorSupport.relanzar(abierto))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Servicio de pagos no disponible temporalmente");

        IllegalStateException validacion = new IllegalStateException("customerEmail is required");
        assertThat(OnvoErrorSupport.relanzar(validacion)).isSameAs(validacion);
    }
}
