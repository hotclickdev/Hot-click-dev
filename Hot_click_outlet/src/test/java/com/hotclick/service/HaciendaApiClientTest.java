package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.service.hacienda.HaciendaConfiguracionException;
import com.hotclick.service.hacienda.HaciendaTransitoriaException;
import com.hotclick.service.hacienda.ResultadoEnvioHacienda;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** Sin red: MockRestServiceServer intercepta el RestTemplate; nunca se llama a Hacienda. */
@DisplayName("HaciendaApiClient — no se traga excepciones ni simula envíos sin ATV")
class HaciendaApiClientTest {

    private static final String URL = "https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/recepcion";

    private RestTemplate rest;
    private MockRestServiceServer server;
    private HaciendaTokenService tokens;
    private HaciendaApiClient client;

    @BeforeEach
    void setUp() {
        rest = new RestTemplate();
        server = MockRestServiceServer.bindTo(rest).build();
        tokens = mock(HaciendaTokenService.class);
        when(tokens.getToken(any())).thenReturn("token-prueba");
        client = new HaciendaApiClient(rest, tokens);
    }

    @Test
    @DisplayName("202 → recibido")
    void aceptaRecepcion() {
        server.expect(requestTo(URL)).andExpect(method(HttpMethod.POST)).andRespond(withStatus(HttpStatus.ACCEPTED));
        ResultadoEnvioHacienda r = client.enviar("<x/>", "clave", empresa());
        assertThat(r.recibido()).isTrue();
        server.verify();
    }

    @Test
    @DisplayName("400 → rechazo de recepción con X-Error-Cause, sin excepción (no se reintenta)")
    void rechazo4xx() {
        HttpHeaders h = new HttpHeaders();
        h.add("X-Error-Cause", "El comprobante ya fue recibido");
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.BAD_REQUEST).headers(h));
        ResultadoEnvioHacienda r = client.enviar("<x/>", "clave", empresa());
        assertThat(r.recibido()).isFalse();
        assertThat(r.status()).isEqualTo(400);
        assertThat(r.motivo()).isEqualTo("El comprobante ya fue recibido");
    }

    @Test
    @DisplayName("503 → HaciendaTransitoriaException (antes se tragaba y devolvía false)")
    void transitoria5xx() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        assertThatThrownBy(() -> client.enviar("<x/>", "clave", empresa()))
            .isInstanceOf(HaciendaTransitoriaException.class);
    }

    @Test
    @DisplayName("Retry de Resilience4j reintenta la falla transitoria: 3 llamadas y luego éxito")
    void retryReintentaTransitoria() {
        server.expect(ExpectedCount.twice(), requestTo(URL)).andRespond(withStatus(HttpStatus.BAD_GATEWAY));
        server.expect(requestTo(URL)).andRespond(withSuccess());
        Retry retry = Retry.of("hacienda-test", RetryConfig.custom()
            .maxAttempts(3).waitDuration(Duration.ofMillis(1))
            .retryExceptions(HaciendaTransitoriaException.class)
            .ignoreExceptions(HaciendaConfiguracionException.class).build());
        Supplier<ResultadoEnvioHacienda> s = Retry.decorateSupplier(retry, () -> client.enviar("<x/>", "c", empresa()));
        assertThat(s.get().recibido()).isTrue();
        server.verify();
    }

    @Test
    @DisplayName("sin usuario ATV no hace POST y lanza error de configuración (antes devolvía true)")
    void sinAtvNoEnvia() {
        server.expect(ExpectedCount.never(), requestTo(URL));
        Empresa e = empresa();
        e.setUsuarioHacienda(null);
        assertThatThrownBy(() -> client.enviar("<x/>", "clave", e)).isInstanceOf(HaciendaConfiguracionException.class);
        server.verify();
    }

    @Test
    @DisplayName("token vacío no hace POST")
    void tokenVacioNoEnvia() {
        when(tokens.getToken(any())).thenReturn("");
        server.expect(ExpectedCount.never(), requestTo(URL));
        assertThatThrownBy(() -> client.enviar("<x/>", "clave", empresa())).isInstanceOf(HaciendaConfiguracionException.class);
        server.verify();
    }

    private static Empresa empresa() {
        Empresa e = new Empresa();
        e.setId(7L);
        e.setTipoCedula("02");
        e.setCedulaJuridica("3101000000");
        e.setUsuarioHacienda("usuario-prueba");
        e.setClaveHaciendaEnc("cifrado");
        e.setAmbienteHacienda("STAG");
        return e;
    }
}
