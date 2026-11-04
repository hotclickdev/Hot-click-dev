package com.hotclick.service.onvo;

import com.hotclick.exception.OnvoSolicitudRechazadaException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.io.InputStream;
import java.net.ProtocolException;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/** ALTO-02: cambiar precio usa PATCH (doc ONVO) y un rechazo/bug nuestro no se trata como caída. */
@DisplayName("[ONVO] ALTO-02 cambiarPrecioSuscripcion")
class OnvoCambiarPrecioAlto02Test {

    private static final String URL = "https://api.onvopay.com/v1/subscriptions/sub_1/items/si_1";

    private RestTemplate restTemplate;
    private MockRestServiceServer server;
    private OnvoBillingClient client;

    @BeforeEach
    void setUp() {
        restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        client = new OnvoBillingClient(restTemplate);
        ReflectionTestUtils.setField(client, "secretKey", "llave-ficticia-de-test");
    }

    @Test
    @DisplayName("Envía PATCH /v1/subscriptions/:id/items/:item con priceId")
    void usaPatchSobreItem() {
        server.expect(requestTo(URL)).andExpect(method(HttpMethod.PATCH))
            .andExpect(jsonPath("$.priceId").value("price_pyme"))
            .andRespond(withSuccess("{\"id\":\"si_1\"}", MediaType.APPLICATION_JSON));
        client.cambiarPrecioSuscripcion("sub_1", "si_1", "price_pyme");
        server.verify();
    }

    @Test
    @DisplayName("4xx de ONVO → OnvoSolicitudRechazadaException (no ResourceAccess, no abre circuito)")
    void cuatroXX_esRechazo() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.BAD_REQUEST));
        assertThatThrownBy(() -> client.cambiarPrecioSuscripcion("sub_1", "si_1", "price_pyme"))
            .isInstanceOf(OnvoSolicitudRechazadaException.class);
    }

    @Test
    @DisplayName("Método no soportado por el cliente HTTP (ProtocolException) → rechazo, no caída")
    void protocolException_esRechazo() {
        server.expect(requestTo(URL)).andRespond(req -> {
            throw new ResourceAccessException("I/O", new ProtocolException("Invalid HTTP method: PATCH"));
        });
        assertThatThrownBy(() -> client.cambiarPrecioSuscripcion("sub_1", "si_1", "price_pyme"))
            .isInstanceOf(OnvoSolicitudRechazadaException.class);
    }

    @Test
    @DisplayName("Fallo de red real sigue siendo ResourceAccessException (cuenta para el circuito)")
    void redCaida_siguePropagando() {
        server.expect(requestTo(URL)).andRespond(req -> {
            throw new ResourceAccessException("timeout", new java.net.SocketTimeoutException());
        });
        assertThatThrownBy(() -> client.cambiarPrecioSuscripcion("sub_1", "si_1", "price_pyme"))
            .isInstanceOf(ResourceAccessException.class);
    }

    @Test
    @DisplayName("El circuito onvo ignora OnvoSolicitudRechazadaException")
    void circuitoIgnoraRechazo() throws Exception {
        Properties p = new Properties();
        try (InputStream in = getClass().getResourceAsStream("/application.properties")) {
            p.load(in);
        }
        assertThat(p.getProperty("resilience4j.circuitbreaker.instances.onvo.ignore-exceptions"))
            .contains(OnvoSolicitudRechazadaException.class.getName());
        assertThat(p.getProperty("resilience4j.retry.instances.onvo.retry-exceptions"))
            .doesNotContain(OnvoSolicitudRechazadaException.class.getName());
    }
}
