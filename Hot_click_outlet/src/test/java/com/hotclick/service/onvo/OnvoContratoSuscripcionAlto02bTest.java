package com.hotclick.service.onvo;

import com.hotclick.exception.OnvoSolicitudRechazadaException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.InputStream;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * ALTO-02b: contrato con la API de ONVO. El priceId solo existe en items[] al crear el cargo recurrente
 * (https://docs.onvopay.com/api/crear-un-cargo-recurrente). El PATCH de items
 * (https://docs.onvopay.com/api/actualizar-item-de-un-cargo-recurrente) solo acepta description, amount, quantity y
 * currency, y ONVO respondía 400 "property priceId should not exist".
 */
@DisplayName("[ONVO] ALTO-02b contrato del body de suscripciones")
class OnvoContratoSuscripcionAlto02bTest {

    private static final String URL = "https://api.onvopay.com/v1/subscriptions";

    private MockRestServiceServer server;
    private OnvoBillingClient client;

    @BeforeEach
    void setUp() {
        RestTemplate restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        client = new OnvoBillingClient(restTemplate);
        ReflectionTestUtils.setField(client, "secretKey", "llave-ficticia-de-test");
    }

    @Test
    @DisplayName("Crear suscripción: JSON exacto con items[].priceId y quantity")
    void crearSuscripcion_jsonExacto() {
        server.expect(requestTo(URL)).andExpect(method(HttpMethod.POST))
            .andExpect(content().json(
                "{\"customerId\":\"cus_1\",\"paymentBehavior\":\"allow_incomplete\","
                    + "\"items\":[{\"priceId\":\"price_pyme\",\"quantity\":1}]}", true))
            .andRespond(withSuccess("{\"id\":\"sub_1\",\"items\":[{\"id\":\"si_1\"}]}", MediaType.APPLICATION_JSON));
        OnvoBillingClient.OnvoSubscription sub = client.crearSuscripcionIncompleta("cus_1", "price_pyme", null);
        assertThat(sub.id()).isEqualTo("sub_1");
        server.verify();
    }

    @Test
    @DisplayName("Crear suscripción con trial: JSON exacto con trialPeriodDays")
    void crearSuscripcionTrial_jsonExacto() {
        server.expect(requestTo(URL)).andExpect(method(HttpMethod.POST))
            .andExpect(content().json(
                "{\"customerId\":\"cus_1\",\"paymentBehavior\":\"allow_incomplete\","
                    + "\"items\":[{\"priceId\":\"price_emp\",\"quantity\":1}],\"trialPeriodDays\":30}", true))
            .andRespond(withSuccess("{\"id\":\"sub_2\"}", MediaType.APPLICATION_JSON));
        client.crearSuscripcionIncompleta("cus_1", "price_emp", null, 30);
        server.verify();
    }

    @Test
    @DisplayName("El cliente ya no tiene ninguna operación que mande priceId a /items (PATCH rechazado por ONVO)")
    void sinCambioDePrecioPorItems() {
        assertThat(Arrays.stream(OnvoBillingClient.class.getDeclaredMethods()).map(Method::getName))
            .doesNotContain("cambiarPrecioSuscripcion", "patch");
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
