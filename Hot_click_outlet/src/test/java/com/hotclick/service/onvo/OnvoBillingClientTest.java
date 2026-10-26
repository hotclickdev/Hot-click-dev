package com.hotclick.service.onvo;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.never;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/**
 * Cliente ONVO de suscripciones SaaS con HTTP simulado (MockRestServiceServer).
 * Nunca usa una llave real: la "llave" es un texto ficticio y ningún request sale de la JVM.
 */
@DisplayName("[ONVO] OnvoBillingClient — HTTP simulado")
class OnvoBillingClientTest {

    private static final String BASE = "https://api.onvopay.com/v1";
    private static final String LLAVE_FICTICIA = "llave-ficticia-de-test";

    private RestTemplate restTemplate;
    private MockRestServiceServer server;
    private OnvoBillingClient client;

    @BeforeEach
    void setUp() {
        restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        client = new OnvoBillingClient(restTemplate);
        ReflectionTestUtils.setField(client, "priceIdPyme", "price_pyme");
        ReflectionTestUtils.setField(client, "priceIdNegocioPlus", " ");
    }

    /** Cliente con perfiles activos simulados (sin llave salvo que se fije). */
    private OnvoBillingClient clienteConPerfiles(String... perfiles) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(perfiles);
        OnvoBillingClient c = new OnvoBillingClient(restTemplate, env);
        ReflectionTestUtils.setField(c, "priceIdPyme", "price_pyme");
        return c;
    }

    private void conLlave() {
        ReflectionTestUtils.setField(client, "secretKey", LLAVE_FICTICIA);
    }

    // ── Sin llave ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("Sin llave: modo simulado y ningún request HTTP sale hacia ONVO")
    void sinLlave_noLlamaHttp() {
        server.expect(never(), requestTo(org.hamcrest.Matchers.startsWith(BASE)));
        client = clienteConPerfiles("test");
        assertThat(client.isMockMode()).isTrue();
        client.cambiarPrecioSuscripcion("sub_1", "item_1", "price_x");
        client.cancelarAlVencer("sub_1");
        assertThat(client.obtenerPrimerItemId("sub_1")).isEqualTo("item_mock");
        server.verify();
    }

    @Test
    @DisplayName("Sin llave en perfil test: crearCustomer/crearSuscripcion devuelven ids *_mock")
    void sinLlave_devuelveIdsMock() {
        client = clienteConPerfiles("test");
        assertThat(client.crearCustomer("a@test.cr", "A", Map.of()).id()).startsWith("cus_mock_");
        OnvoBillingClient.OnvoSubscription sub = client.crearSuscripcionIncompleta("cus_1", "price_pyme", null);
        assertThat(sub.id()).startsWith("sub_mock_");
        assertThat(sub.itemId()).isEqualTo("item_mock");
    }

    @Test
    @DisplayName("Sin llave y sin perfil dev/test: crearSuscripcionIncompleta falla cerrado")
    void sinLlave_deberiaFallarCerrado() {
        assertThatThrownBy(() -> client.crearSuscripcionIncompleta("cus_1", "price_pyme", null))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Sin llave fuera de dev/test: ninguna operación devuelve mocks ni llama a ONVO")
    void sinLlave_fueraDeDevTest_todoFallaCerrado() {
        server.expect(never(), requestTo(org.hamcrest.Matchers.startsWith(BASE)));
        for (String[] perfiles : new String[][]{{}, {"prod"}, {"production"}, {"dev", "prod"},
                                                {"test", "production"}, {"staging"}}) {
            OnvoBillingClient c = clienteConPerfiles(perfiles);
            assertThatThrownBy(() -> c.crearCustomer("a@test.cr", "A", Map.of()))
                .as("perfiles %s", String.join(",", perfiles)).isInstanceOf(IllegalStateException.class);
            assertThatThrownBy(() -> c.crearSuscripcionIncompleta("cus_1", "price_pyme", null))
                .isInstanceOf(IllegalStateException.class);
            assertThatThrownBy(() -> c.cambiarPrecioSuscripcion("sub_1", "si_1", "price_pyme"))
                .isInstanceOf(IllegalStateException.class);
            assertThatThrownBy(() -> c.cancelarAlVencer("sub_1")).isInstanceOf(IllegalStateException.class);
            assertThatThrownBy(() -> c.obtenerPrimerItemId("sub_1")).isInstanceOf(IllegalStateException.class);
        }
        server.verify();
    }

    @Test
    @DisplayName("dev/test con llave que no es onvo_test_: falla antes de llamar a ONVO")
    void devTest_llaveNoDePrueba_falla() {
        server.expect(never(), requestTo(org.hamcrest.Matchers.startsWith(BASE)));
        for (String perfil : new String[]{"dev", "test"}) {
            OnvoBillingClient c = clienteConPerfiles(perfil);
            ReflectionTestUtils.setField(c, "secretKey", LLAVE_FICTICIA);
            assertThatThrownBy(() -> c.crearCustomer("a@test.cr", "A", null))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("onvo_test_");
        }
        server.verify();
    }

    @Test
    @DisplayName("Perfil test con llave onvo_test_: llama a ONVO con esa llave")
    void test_llaveDePrueba_llamaHttp() {
        client = clienteConPerfiles("test");
        String llaveTest = "onvo_test_ficticia";
        ReflectionTestUtils.setField(client, "secretKey", llaveTest);
        server.expect(requestTo(BASE + "/customers"))
            .andExpect(header("Authorization", "Bearer " + llaveTest))
            .andRespond(withSuccess("{\"id\":\"cus_t\"}", MediaType.APPLICATION_JSON));
        assertThat(client.crearCustomer("a@test.cr", "A", null).id()).isEqualTo("cus_t");
        server.verify();
    }

    @Test
    @DisplayName("Llave en blanco cuenta como sin llave")
    void llaveEnBlanco_esMock() {
        ReflectionTestUtils.setField(client, "secretKey", "   ");
        assertThat(client.sinLlave()).isTrue();
        // Sin Environment no hay perfil de simulación: no es modo mock (fail-closed)
        assertThat(client.isMockMode()).isFalse();
    }

    @Test
    @DisplayName("isMockMode consulta el perfil: sin llave solo es mock en dev/test sin perfil productivo")
    void isMockMode_consultaPerfil() {
        assertThat(clienteConPerfiles("test").isMockMode()).isTrue();
        assertThat(clienteConPerfiles("dev").isMockMode()).isTrue();
        for (String[] perfiles : new String[][]{{}, {"prod"}, {"production"}, {"dev", "prod"}, {"test", "production"}}) {
            assertThat(clienteConPerfiles(perfiles).isMockMode()).as(String.join(",", perfiles)).isFalse();
        }
    }

    @Test
    @DisplayName("Llave onvo_test_ fuera de dev/test: authHeaders rechaza y no sale request")
    void llaveDePrueba_fueraDeDevTest_falla() {
        server.expect(never(), requestTo(org.hamcrest.Matchers.startsWith(BASE)));
        for (String[] perfiles : new String[][]{{}, {"prod"}, {"production"}, {"dev", "prod"}}) {
            OnvoBillingClient c = clienteConPerfiles(perfiles);
            ReflectionTestUtils.setField(c, "secretKey", "onvo_test_ficticia");
            assertThat(c.isMockMode()).isFalse();
            assertThatThrownBy(() -> c.crearCustomer("a@test.cr", "A", null))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("llave de prueba");
            assertThatThrownBy(() -> c.obtenerPrimerItemId("sub_1")).isInstanceOf(IllegalStateException.class);
            assertThatThrownBy(() -> c.cancelarAlVencer("sub_1")).isInstanceOf(IllegalStateException.class);
        }
        server.verify();
    }

    @Test
    @DisplayName("@PostConstruct: llave onvo_test_ en prod → log.error [ALERTA-PAGO] sin la llave; en test no alerta")
    void arranque_llaveDePruebaEnProd_alerta() {
        ch.qos.logback.classic.Logger logger =
            (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(OnvoBillingClient.class);
        ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> app =
            new ch.qos.logback.core.read.ListAppender<>();
        app.start();
        logger.addAppender(app);
        try {
            OnvoBillingClient prod = clienteConPerfiles("prod");
            ReflectionTestUtils.setField(prod, "secretKey", "onvo_test_secreto_xyz");
            prod.validarLlaveAlArrancar();
            OnvoBillingClient test = clienteConPerfiles("test");
            ReflectionTestUtils.setField(test, "secretKey", "onvo_test_secreto_xyz");
            test.validarLlaveAlArrancar();
        } finally {
            logger.detachAppender(app);
        }
        assertThat(app.list).hasSize(1);
        assertThat(app.list.get(0).getLevel()).isEqualTo(ch.qos.logback.classic.Level.ERROR);
        assertThat(app.list.get(0).getFormattedMessage()).contains("[ALERTA-PAGO]").doesNotContain("secreto_xyz");
    }

    @Test
    @DisplayName("Fallback: el log usa clase y status HTTP, no el mensaje")
    void statusDe() {
        assertThat(OnvoBillingClient.statusDe(org.springframework.web.client.HttpClientErrorException.create(
            org.springframework.http.HttpStatus.UNAUTHORIZED, "x", null, "{\"key\":\"secreto\"}".getBytes(), null)))
            .isEqualTo("401");
        assertThat(OnvoBillingClient.statusDe(new IllegalStateException("secreto"))).isEqualTo("n/a");
    }

    // ── Con llave (ficticia) ───────────────────────────────────────────────

    @Test
    @DisplayName("crearCustomer: POST /customers con Bearer y JSON; devuelve el id")
    void crearCustomer_ok() {
        conLlave();
        server.expect(requestTo(BASE + "/customers"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer " + LLAVE_FICTICIA))
            .andExpect(jsonPath("$.email").value("a@test.cr"))
            .andExpect(jsonPath("$.metadata.empresaId").value("7"))
            .andRespond(withSuccess("{\"id\":\"cus_123\"}", MediaType.APPLICATION_JSON));
        assertThat(client.crearCustomer("a@test.cr", "A", Map.of("empresaId", "7")).id()).isEqualTo("cus_123");
        server.verify();
    }

    @Test
    @DisplayName("crearCustomer: respuesta sin id → IllegalStateException")
    void crearCustomer_sinId() {
        conLlave();
        server.expect(requestTo(BASE + "/customers"))
            .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.crearCustomer("a@test.cr", "A", null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("sin id");
    }

    @Test
    @DisplayName("crearSuscripcionIncompleta: allow_incomplete + item; lee itemId de items[0] o data.items[0]")
    void crearSuscripcion_ok() {
        conLlave();
        server.expect(requestTo(BASE + "/subscriptions"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.paymentBehavior").value("allow_incomplete"))
            .andExpect(jsonPath("$.items[0].priceId").value("price_pyme"))
            .andRespond(withSuccess("{\"id\":\"sub_9\",\"data\":{\"items\":[{\"id\":\"si_1\"}]}}",
                MediaType.APPLICATION_JSON));
        OnvoBillingClient.OnvoSubscription sub = client.crearSuscripcionIncompleta("cus_1", "price_pyme", null);
        assertThat(sub.id()).isEqualTo("sub_9");
        assertThat(sub.itemId()).isEqualTo("si_1");
        server.verify();
    }

    @Test
    @DisplayName("HTTP 401 de ONVO (llave inválida) se propaga; no se inventa un id")
    void http401_sePropaga() {
        conLlave();
        server.expect(requestTo(BASE + "/subscriptions")).andRespond(withStatus(HttpStatus.UNAUTHORIZED));
        assertThatThrownBy(() -> client.crearSuscripcionIncompleta("cus_1", "price_pyme", null))
            .isInstanceOf(HttpClientErrorException.Unauthorized.class);
    }

    @Test
    @DisplayName("HTTP 500 de ONVO se propaga al cambiar precio")
    void http500_sePropaga() {
        conLlave();
        server.expect(requestTo(BASE + "/subscriptions/sub_1/items/si_1"))
            .andExpect(method(HttpMethod.PATCH))
            .andRespond(withServerError());
        assertThatThrownBy(() -> client.cambiarPrecioSuscripcion("sub_1", "si_1", "price_pyme"))
            .isInstanceOf(HttpServerErrorException.class);
    }

    @Test
    @DisplayName("cambiarPrecio sin itemId falla antes de llamar a ONVO")
    void cambiarPrecio_sinItem() {
        conLlave();
        server.expect(never(), requestTo(org.hamcrest.Matchers.startsWith(BASE)));
        assertThatThrownBy(() -> client.cambiarPrecioSuscripcion("sub_1", " ", "price_pyme"))
            .isInstanceOf(IllegalStateException.class);
        server.verify();
    }

    @Test
    @DisplayName("cancelarAlVencer: sub_mock no llama a ONVO; sub real hace POST cancelAtPeriodEnd")
    void cancelar() {
        conLlave();
        server.expect(requestTo(BASE + "/subscriptions/sub_real/cancel"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.cancelAtPeriodEnd").value(true))
            .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        client.cancelarAlVencer("sub_mock_1");
        client.cancelarAlVencer("sub_real");
        server.verify();
    }

    @Test
    @DisplayName("getPriceIdForPlan: PYME mapea, NEGOCIO_PLUS en blanco → null, plan desconocido → null")
    void priceIds() {
        assertThat(client.getPriceIdForPlan("pyme")).isEqualTo("price_pyme");
        assertThat(client.getPriceIdForPlan("NEGOCIO_PLUS")).isNull();
        assertThat(client.getPriceIdForPlan("OTRO")).isNull();
        assertThat(client.getPriceIdForPlan(null)).isNull();
    }
}
