package com.hotclick.service.onvo;

import com.hotclick.service.onvo.OnvoBillingClient.ResultadoCancelacion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.net.SocketTimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.never;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/**
 * MEDIO Seguridad (Opción A): cancelación pedida por el negocio con HTTP simulado (MockRestServiceServer).
 * Nunca usa una llave real: la "llave" es un texto ficticio y ningún request sale de la JVM.
 */
@DisplayName("[ONVO] cancelarPorNegocio: confirmación explícita, sin reintentos ciegos, sin Idempotency-Key")
class OnvoBillingClientCancelarPorNegocioTest {

    private static final String BASE = "https://api.onvopay.com/v1";
    private static final String SUB = "clsubtrial0001";
    private static final String URL = BASE + "/subscriptions/" + SUB;

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

    private static String sub(String status, boolean cancelAtPeriodEnd) {
        return "{\"id\":\"" + SUB + "\",\"status\":\"" + status + "\",\"cancelAtPeriodEnd\":" + cancelAtPeriodEnd + "}";
    }

    @Test
    @DisplayName("inmediata=true: un DELETE con status canceled → CANCELADA; sin Idempotency-Key")
    void inmediata_delete_confirmado() {
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.DELETE))
            .andExpect(headerDoesNotExist("Idempotency-Key"))
            .andRespond(withSuccess(sub("canceled", false), MediaType.APPLICATION_JSON));
        assertThat(client.cancelarPorNegocio(SUB, true)).isEqualTo(ResultadoCancelacion.CANCELADA);
        server.verify();
    }

    @Test
    @DisplayName("inmediata=false: un POST cancelAtPeriodEnd=true confirmado → PROGRAMADA; sin Idempotency-Key")
    void alVencer_post_confirmado() {
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.cancelAtPeriodEnd").value(true))
            .andExpect(headerDoesNotExist("Idempotency-Key"))
            .andRespond(withSuccess(sub("trialing", true), MediaType.APPLICATION_JSON));
        assertThat(client.cancelarPorNegocio(SUB, false)).isEqualTo(ResultadoCancelacion.PROGRAMADA);
        server.verify();
    }

    @Test
    @DisplayName("inmediata=false y ONVO responde canceled → CANCELADA")
    void alVencer_onvoCancelaYa() {
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.POST))
            .andRespond(withSuccess(sub("canceled", false), MediaType.APPLICATION_JSON));
        assertThat(client.cancelarPorNegocio(SUB, false)).isEqualTo(ResultadoCancelacion.CANCELADA);
        server.verify();
    }

    @Test
    @DisplayName("DELETE falla (500) → NO se repite el DELETE; un GET confirma canceled → CANCELADA")
    void delete500_getConfirma() {
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.DELETE))
            .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess(sub("canceled", false), MediaType.APPLICATION_JSON));
        assertThat(client.cancelarPorNegocio(SUB, true)).isEqualTo(ResultadoCancelacion.CANCELADA);
        server.verify();
    }

    @Test
    @DisplayName("DELETE falla y el GET sigue en trialing → excepción (fail-closed), un solo DELETE")
    void delete500_getNoConfirma_falla() {
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.DELETE))
            .andRespond(withStatus(HttpStatus.BAD_GATEWAY));
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess(sub("trialing", false), MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.cancelarPorNegocio(SUB, true)).isInstanceOf(IllegalStateException.class);
        server.verify();
    }

    @Test
    @DisplayName("POST con timeout → NO se repite el POST; GET también cae → excepción (fail-closed)")
    void postTimeout_getCae_falla() {
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.POST))
            .andRespond(withException(new SocketTimeoutException("Read timed out")));
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.GET))
            .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        assertThatThrownBy(() -> client.cancelarPorNegocio(SUB, false)).isInstanceOf(RuntimeException.class);
        server.verify();
    }

    @Test
    @DisplayName("POST con timeout, el GET confirma cancelAtPeriodEnd → PROGRAMADA (sin repetir la escritura)")
    void postTimeout_getConfirma() {
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.POST))
            .andRespond(withException(new SocketTimeoutException("Read timed out")));
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess(sub("trialing", true), MediaType.APPLICATION_JSON));
        assertThat(client.cancelarPorNegocio(SUB, false)).isEqualTo(ResultadoCancelacion.PROGRAMADA);
        server.verify();
    }

    @Test
    @DisplayName("Respuesta ambigua (200 sin confirmar) y GET igual → excepción")
    void respuestaAmbigua_falla() {
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.POST))
            .andRespond(withSuccess(sub("trialing", false), MediaType.APPLICATION_JSON));
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess(sub("trialing", false), MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.cancelarPorNegocio(SUB, false)).isInstanceOf(IllegalStateException.class);
        server.verify();
    }

    @Test
    @DisplayName("inmediata=true: cancelAtPeriodEnd no cuenta como cancelación inmediata")
    void inmediata_cancelAtPeriodEndNoBasta() {
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.DELETE))
            .andRespond(withSuccess(sub("trialing", true), MediaType.APPLICATION_JSON));
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess(sub("trialing", true), MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.cancelarPorNegocio(SUB, true)).isInstanceOf(IllegalStateException.class);
        server.verify();
    }

    @Test
    @DisplayName("Confirmación de OTRA suscripción no vale")
    void otroId_noConfirma() {
        assertThat(OnvoBillingClient.cancelacionConfirmada(
            java.util.Map.of("id", "clsubotra", "status", "canceled"), SUB, true)).isNull();
        assertThat(OnvoBillingClient.cancelacionConfirmada(java.util.Map.of(), SUB, true)).isNull();
        // (3) Sin id no es confirmación de ESTA suscripción.
        assertThat(OnvoBillingClient.cancelacionConfirmada(java.util.Map.of("status", "canceled"), SUB, true)).isNull();
        assertThat(OnvoBillingClient.cancelacionConfirmada(
            java.util.Map.of("status", "trialing", "cancelAtPeriodEnd", true), SUB, false)).isNull();
        assertThat(OnvoBillingClient.cancelacionConfirmada(java.util.Map.of("id", SUB, "status", "canceled"), null, true)).isNull();
        assertThat(OnvoBillingClient.cancelacionConfirmada(null, SUB, false)).isNull();
        assertThat(OnvoBillingClient.cancelacionConfirmada(
            java.util.Map.of("id", SUB, "status", "incomplete_expired"), SUB, true)).isEqualTo(ResultadoCancelacion.CANCELADA);
    }

    @Test
    @DisplayName("(3) DELETE y GET responden canceled SIN id → excepción (no se acepta como confirmación)")
    void respuestaSinId_falla() {
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.DELETE))
            .andRespond(withSuccess("{\"status\":\"canceled\"}", MediaType.APPLICATION_JSON));
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess("{\"status\":\"canceled\"}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.cancelarPorNegocio(SUB, true)).isInstanceOf(IllegalStateException.class);
        server.verify();
    }

    @Test
    @DisplayName("(3) POST sin id pero GET con el id correcto → PROGRAMADA (la confirmación sale del GET)")
    void postSinId_getConId() {
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.POST))
            .andRespond(withSuccess("{\"status\":\"trialing\",\"cancelAtPeriodEnd\":true}", MediaType.APPLICATION_JSON));
        server.expect(once(), requestTo(URL)).andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess(sub("trialing", true), MediaType.APPLICATION_JSON));
        assertThat(client.cancelarPorNegocio(SUB, false)).isEqualTo(ResultadoCancelacion.PROGRAMADA);
        server.verify();
    }

    @Test
    @DisplayName("Id inválido → excepción sin llamar a ONVO")
    void idInvalido_noLlama() {
        server.expect(never(), requestTo(org.hamcrest.Matchers.startsWith(BASE)));
        assertThatThrownBy(() -> client.cancelarPorNegocio("../customers/x", true))
            .isInstanceOf(IllegalArgumentException.class);
        server.verify();
    }

    @Test
    @DisplayName("Simulación: solo en dev/test sin llave; fuera de dev/test un sub_mock falla cerrado")
    void simulacion_soloDevTest() {
        server.expect(never(), requestTo(org.hamcrest.Matchers.startsWith(BASE)));
        MockEnvironment test = new MockEnvironment();
        test.setActiveProfiles("test");
        OnvoBillingClient sim = new OnvoBillingClient(restTemplate, test);
        assertThat(sim.cancelarPorNegocio("sub_mock_1", true)).isEqualTo(ResultadoCancelacion.CANCELADA);
        assertThat(sim.cancelarPorNegocio("sub_mock_1", false)).isEqualTo(ResultadoCancelacion.PROGRAMADA);
        MockEnvironment prod = new MockEnvironment();
        prod.setActiveProfiles("prod");
        OnvoBillingClient p = new OnvoBillingClient(restTemplate, prod);
        ReflectionTestUtils.setField(p, "secretKey", "llave-ficticia-de-test");
        assertThatThrownBy(() -> p.cancelarPorNegocio("sub_mock_1", true)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> client.cancelarPorNegocio("sub_mock_1", false)).isInstanceOf(IllegalStateException.class);
        server.verify();
    }

    @Test
    @DisplayName("Sin @Retry en cancelarPorNegocio ni en cancelarAlVencer (POST/escritura sin idempotencia documentada)")
    void sinRetry() {
        for (var m : OnvoBillingClient.class.getDeclaredMethods()) {
            if (m.getName().equals("cancelarPorNegocio") || m.getName().equals("cancelarAlVencer")) {
                assertThat(m.isAnnotationPresent(io.github.resilience4j.retry.annotation.Retry.class))
                    .as("@Retry en " + m).isFalse();
            }
        }
    }
}
