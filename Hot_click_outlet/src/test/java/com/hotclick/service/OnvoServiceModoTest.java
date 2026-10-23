package com.hotclick.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@DisplayName("ONVO | sin llave solo simula en dev/test; en otro perfil queda cerrado")
class OnvoServiceModoTest {

    private final RestTemplate restTemplate = mock(RestTemplate.class);

    private OnvoService servicio(String llave, String... perfiles) {
        OnvoService s = new OnvoService(restTemplate);
        ReflectionTestUtils.setField(s, "secretKey", llave);
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(perfiles);
        ReflectionTestUtils.setField(s, "environment", env);
        s.init();
        return s;
    }

    @Test
    @DisplayName("Sin llave en producción: no simula, no crea cobros ni ids falsos y no consulta a ONVO")
    void sinLlaveEnProduccionFallaCerrado() {
        OnvoService prod = servicio("", "prod");

        assertThat(prod.isMockMode()).isFalse();
        assertThat(prod.isPagosDisponibles()).isFalse();
        assertThatThrownBy(() -> prod.crearCheckoutSession(1000, "x", "ok", "ko", null, Map.of()))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("no está configurado");
        assertThatThrownBy(() -> prod.crearPaymentIntent(1000, "x", Map.of()))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> prod.crearMetodoPagoSinpe("id-ficticia", "numero-ficticio", "n", null))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> prod.confirmarPaymentIntent("pi_1", "pm_1"))
            .isInstanceOf(IllegalStateException.class);
        assertThat(prod.obtenerCheckoutSession("cs_1")).isEmpty();
        assertThat(prod.obtenerPaymentIntent("pi_1")).isEmpty();
        assertThat(prod.paymentIntentPagado("pi_1")).isFalse();
        verifyNoInteractions(restTemplate);
    }

    @Test
    @DisplayName("Sin perfil activo (default) también queda cerrado")
    void sinPerfilQuedaCerrado() {
        OnvoService def = servicio("");
        assertThat(def.isMockMode()).isFalse();
        assertThat(def.isPagosDisponibles()).isFalse();
    }

    @Test
    @DisplayName("Sin llave en dev o test: modo simulado, y la simulación nunca da un cobro por pagado")
    void sinLlaveEnDevSimula() {
        for (String perfil : new String[] {"dev", "test"}) {
            OnvoService dev = servicio("", perfil);
            assertThat(dev.isMockMode()).isTrue();
            assertThat(dev.crearCheckoutSession(1000, "x", "ok", "ko", null, Map.of()).id()).startsWith("onvo_mock_");
            assertThat(dev.obtenerCheckoutSession("cs_1")).isEmpty();
            assertThat(dev.obtenerPaymentIntent("pi_1")).isEmpty();
        }
        verifyNoInteractions(restTemplate);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    @DisplayName("Con llave: lee la sesión en GET /v1/checkout/sessions/{id} y el intent en /v1/payment-intents/{id}")
    void conLlaveLeeRutasDeOnvo() {
        OnvoService s = servicio("onvo_live_secret_key_abc", "prod");
        when(restTemplate.exchange(eq("https://api.onvopay.com/v1/checkout/sessions/cs_1"), any(), any(), eq(Map.class)))
            .thenReturn((ResponseEntity) ResponseEntity.ok(Map.of("paymentStatus", "paid")));
        when(restTemplate.exchange(eq("https://api.onvopay.com/v1/payment-intents/pi_1"), any(), any(), eq(Map.class)))
            .thenReturn((ResponseEntity) ResponseEntity.ok(Map.of("status", "succeeded")));

        assertThat(s.obtenerCheckoutSession("cs_1").get("paymentStatus")).isEqualTo("paid");
        assertThat(s.obtenerPaymentIntent("pi_1").get("status")).isEqualTo("succeeded");
    }

    @Test
    @DisplayName("M3: llave de prueba fuera de dev/test → pagos apagados y sin consultar a ONVO")
    void llaveDePruebaEnProduccion() {
        OnvoService prod = servicio("onvo_test_secret_key_abc", "prod");
        assertThat(prod.isPagosDisponibles()).isFalse();
        assertThat(prod.isMockMode()).isFalse();
        assertThatThrownBy(() -> prod.crearCheckoutSession(1000, "x", "ok", "ko", null, Map.of()))
            .isInstanceOf(IllegalStateException.class);
        assertThat(prod.obtenerCheckoutSession("cs_1")).isEmpty();
        verifyNoInteractions(restTemplate);

        OnvoService dev = servicio("onvo_test_secret_key_abc", "dev");
        assertThat(dev.isPagosDisponibles()).isTrue();
        assertThat(dev.modoEsperado()).isEqualTo("test");
        assertThat(servicio("onvo_live_secret_key_abc", "prod").modoEsperado()).isEqualTo("live");
    }

    @Test
    @DisplayName("M1: 401, 403 o 429 de ONVO no son «no existe»: se relanzan para que nadie cancele")
    void errorDeAutorizacionOLimiteSeRelanza() {
        OnvoService s = servicio("onvo_live_secret_key_abc", "prod");
        for (HttpStatus estado : new HttpStatus[] {HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.TOO_MANY_REQUESTS}) {
            when(restTemplate.exchange(anyString(), any(), any(), eq(Map.class)))
                .thenThrow(HttpClientErrorException.create(estado, estado.getReasonPhrase(), null, null, null));
            assertThatThrownBy(() -> s.obtenerCheckoutSession("cs_1")).isInstanceOf(HttpClientErrorException.class);
            assertThatThrownBy(() -> s.expirarCheckoutSession("cs_1")).isInstanceOf(HttpClientErrorException.class);
        }
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    @DisplayName("M2: expirar usa POST /v1/checkout/sessions/{id}/expire y devuelve la sesión de ONVO")
    void expirarSesion() {
        OnvoService s = servicio("onvo_live_secret_key_abc", "prod");
        when(restTemplate.exchange(eq("https://api.onvopay.com/v1/checkout/sessions/cs_1/expire"), any(), any(), eq(Map.class)))
            .thenReturn((ResponseEntity) ResponseEntity.status(201).body(Map.of("status", "expired")));
        assertThat(s.expirarCheckoutSession("cs_1").get("status")).isEqualTo("expired");
        assertThat(s.expirarCheckoutSession("../x")).isEmpty();
    }

    @Test
    @DisplayName("Con llave: un 404 de ONVO da vacío; un id con forma rara ni se consulta")
    void conLlave404EIdInvalido() {
        OnvoService s = servicio("onvo_live_secret_key_abc", "prod");
        when(restTemplate.exchange(anyString(), any(), any(), eq(Map.class)))
            .thenThrow(HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", null, null, null));

        assertThat(s.obtenerCheckoutSession("cs_inexistente")).isEmpty();
        assertThat(s.obtenerCheckoutSession("../payment-intents/pi_1")).isEmpty();
        assertThat(s.obtenerPaymentIntent(null)).isEmpty();
    }

    @Test
    @DisplayName("dev+prod o dev+production sin llave: falla cerrado, no simula")
    void devMasProdFallaCerrado() {
        for (String[] perfiles : new String[][] {{"dev", "prod"}, {"dev", "production"}, {"test", "prod"}}) {
            OnvoService s = servicio("", perfiles);
            assertThat(s.isMockMode()).as(String.join("+", perfiles)).isFalse();
            assertThat(s.isPagosDisponibles()).as(String.join("+", perfiles)).isFalse();
            assertThatThrownBy(() -> s.crearCheckoutSession(1000, "x", "ok", "ko", null, Map.of()))
                .isInstanceOf(IllegalStateException.class);
        }
        verifyNoInteractions(restTemplate);
    }

    @Test
    @DisplayName("dev+prod con llave de prueba: pagos deshabilitados")
    void devMasProdConLlavePruebaDeshabilita() {
        OnvoService s = servicio("onvo_test_secret_key_ficticia", "dev", "prod");
        assertThat(s.isPagosDisponibles()).isFalse();
    }

    @Test
    @DisplayName("prod/production en mayúsculas o mixto (dev,PROD / test,Production): sin llave no simula")
    void prodEnMayusculasSinLlaveFallaCerrado() {
        for (String[] perfiles : new String[][] {{"dev", "PROD"}, {"test", "Production"}, {"TEST", "prod"}}) {
            OnvoService s = servicio("", perfiles);
            assertThat(s.isMockMode()).as(String.join("+", perfiles)).isFalse();
            assertThat(s.isPagosDisponibles()).as(String.join("+", perfiles)).isFalse();
        }
        verifyNoInteractions(restTemplate);
    }

    @Test
    @DisplayName("Llave onvo_test_ con prod en cualquier capitalización o sin perfil: pagos deshabilitados; solo dev la acepta")
    void llavePruebaConProdMayusculasDeshabilita() {
        for (String[] perfiles : new String[][] {{"dev", "PROD"}, {"test", "Production"}, {}}) {
            assertThat(servicio("onvo_test_secret_key_ficticia", perfiles).isPagosDisponibles())
                .as(String.join("+", perfiles)).isFalse();
        }
        assertThat(servicio("onvo_test_secret_key_ficticia", "dev").isPagosDisponibles()).isTrue();
    }
}
