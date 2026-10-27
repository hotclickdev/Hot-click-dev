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

    private static final String CLAVE_50 = "50626102600310100000000100001010000000001199999999";

    @Test
    @DisplayName("logs: clave enmascarada (lleva la cédula) y causa sin dígitos largos ni saltos de línea")
    void logsSinClaveNiCausaCruda() {
        ch.qos.logback.classic.Logger lg = (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(HaciendaApiClient.class);
        ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> app = new ch.qos.logback.core.read.ListAppender<>();
        app.start();
        lg.addAppender(app);
        try {
            server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.ACCEPTED));
            HttpHeaders h = new HttpHeaders();
            h.add("X-Error-Cause", "Clave " + CLAVE_50 + " duplicada\ninyectado");
            server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.BAD_REQUEST).headers(h));
            server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE).body("cedula 3101000000"));
            client.enviar("<x/>", CLAVE_50, empresa());
            ResultadoEnvioHacienda r = client.enviar("<x/>", CLAVE_50, empresa());
            assertThat(r.motivo()).doesNotContain(CLAVE_50).doesNotContain("\n");
            assertThatThrownBy(() -> client.enviar("<x/>", CLAVE_50, empresa()))
                .isInstanceOf(HaciendaTransitoriaException.class)
                .satisfies(ex -> assertThat(ex.getMessage()).doesNotContain(CLAVE_50).doesNotContain("3101000000"));
            assertThat(app.list).hasSizeGreaterThanOrEqualTo(3);
            for (var ev : app.list) {
                String msg = ev.getFormattedMessage();
                assertThat(msg).doesNotContain(CLAVE_50).doesNotContain("3101000000").doesNotContain("\n");
            }
            assertThat(app.list.get(0).getFormattedMessage()).contains("clave=***9999");
        } finally {
            lg.detachAppender(app);
        }
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
