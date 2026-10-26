package com.hotclick.service.payment;

import com.hotclick.service.payment.GuestCancelTokenService.Proposito;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("GuestCancelTokenService")
class GuestCancelTokenServiceTest {

    private static final String JWT = "test-jwt-secret-for-hmac-32chars!!";
    private static final Instant AHORA = Instant.parse("2026-10-22T12:00:00Z");

    private GuestCancelTokenService service;

    @BeforeEach
    void setUp() {
        service = nuevo("clave-v2-de-prueba-no-real-0123456789", "");
    }

    private static GuestCancelTokenService nuevo(String claveV2, String v1Hasta) {
        GuestCancelTokenService s = new GuestCancelTokenService();
        ReflectionTestUtils.setField(s, "secret", JWT);
        ReflectionTestUtils.setField(s, "claveV2", claveV2);
        ReflectionTestUtils.setField(s, "v1AceptarHasta", v1Hasta);
        ReflectionTestUtils.setField(s, "appUrl", "http://localhost:3000");
        s.setClock(Clock.fixed(AHORA, ZoneOffset.UTC));
        return s;
    }

    private static String tokenV1(String pedido) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(JWT.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(pedido.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    @DisplayName("emitir + esValido round-trip")
    void emitirYValidar() {
        String token = service.emitir("ORD-XYZ");
        assertThat(token).startsWith("v2.");
        assertThat(service.esValido("ORD-XYZ", token)).isTrue();
        assertThat(service.esValido("ORD-OTRO", token)).isFalse();
        assertThat(service.esValido("ORD-XYZ", null)).isFalse();
        assertThat(service.esValido("ORD-XYZ", "")).isFalse();
    }

    @Test
    void propositoNoIntercambiable() {
        String cancelar = service.emitir("ORD-1", Proposito.CANCELAR);
        String reintentar = service.emitir("ORD-1", Proposito.REINTENTAR);
        assertThat(service.esValido("ORD-1", cancelar, Proposito.REINTENTAR)).isFalse();
        assertThat(service.esValido("ORD-1", reintentar, Proposito.CANCELAR)).isFalse();
        assertThat(service.esValido("ORD-1", reintentar, Proposito.REINTENTAR)).isTrue();
    }

    @Test
    void venceA24Horas() {
        String token = service.emitir("ORD-1");
        service.setClock(Clock.fixed(AHORA.plus(Duration.ofHours(24)).minusSeconds(1), ZoneOffset.UTC));
        assertThat(service.esValido("ORD-1", token)).isTrue();
        service.setClock(Clock.fixed(AHORA.plus(Duration.ofHours(24)), ZoneOffset.UTC));
        assertThat(service.esValido("ORD-1", token)).isFalse();
    }

    @Test
    void expiracionManipuladaOFormatoRaroSeRechaza() {
        String token = service.emitir("ORD-1");
        String[] p = token.split("\\.");
        String extendido = "v2." + (Long.parseLong(p[1]) + 86400) + "." + p[2];
        assertThat(service.esValido("ORD-1", extendido)).isFalse();
        assertThat(service.esValido("ORD-1", "v2.abc." + p[2])).isFalse();
        assertThat(service.esValido("ORD-1", "v2." + p[1])).isFalse();
        assertThat(service.esValido("ORD-1", token + ".x")).isFalse();
    }

    @Test
    void otraClaveV2NoValida() {
        String token = service.emitir("ORD-1");
        assertThat(nuevo("otra-clave-v2-de-prueba-0123456789xx", "").esValido("ORD-1", token)).isFalse();
    }

    @Test
    void v1SoloDentroDeLaVentana() throws Exception {
        String v1 = tokenV1("ORD-1");
        assertThat(service.esValido("ORD-1", v1)).as("sin ventana").isFalse();

        GuestCancelTokenService compat = nuevo("clave-v2-de-prueba-no-real-0123456789", "2026-10-23T00:00:00Z");
        assertThat(compat.esValido("ORD-1", v1)).isTrue();
        assertThat(compat.esValido("ORD-1", v1, Proposito.REINTENTAR)).isTrue();
        assertThat(compat.esValido("ORD-2", v1)).isFalse();

        compat.setClock(Clock.fixed(Instant.parse("2026-10-23T00:00:00Z"), ZoneOffset.UTC));
        assertThat(compat.esValido("ORD-1", v1)).as("ventana cerrada").isFalse();
    }

    @Test
    void prodSinClaveDedicadaFallaCerrado() {
        GuestCancelTokenService prod = nuevo("", "");
        ReflectionTestUtils.setField(prod, "appUrl", "https://hotclick.lat");
        assertThatThrownBy(prod::validarConfig).isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("GUEST_TOKEN_SECRET");
        ReflectionTestUtils.setField(prod, "claveV2", "corta");
        assertThatThrownBy(prod::validarConfig).isInstanceOf(IllegalStateException.class);
        ReflectionTestUtils.setField(prod, "claveV2", "clave-v2-de-prueba-no-real-0123456789");
        prod.validarConfig();
    }

    @Test
    void fueraDeProdSinClaveDerivaClaveLocalDistintaDeV1() throws Exception {
        GuestCancelTokenService dev = nuevo("", "");
        dev.validarConfig();
        String token = dev.emitir("ORD-1");
        assertThat(dev.esValido("ORD-1", token)).isTrue();
        assertThat(token).doesNotContain(tokenV1("ORD-1"));
    }

    @Test
    void ventanaV1MalFormadaFallaAlArrancar() {
        GuestCancelTokenService s = nuevo("clave-v2-de-prueba-no-real-0123456789", "mañana");
        assertThatThrownBy(s::validarConfig).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void secExpLejanoDebeRechazarse() {
        long exp = AHORA.plus(java.time.Duration.ofDays(3650)).getEpochSecond();
        String firma = ReflectionTestUtils.invokeMethod(service, "firmaV2", GuestCancelTokenService.Proposito.REINTENTAR, "ORD-1", exp);
        org.assertj.core.api.Assertions.assertThat(service.esValido("ORD-1", "v2." + exp + "." + firma, GuestCancelTokenService.Proposito.REINTENTAR)).as("exp a 10 años").isFalse();
    }

    @Test
    void expDentroDeVigenciaMasSkewSeAceptaYFueraSeRechaza() {
        long limite = AHORA.plus(Duration.ofHours(24)).plus(Duration.ofMinutes(5)).getEpochSecond();
        String ok = ReflectionTestUtils.invokeMethod(service, "firmaV2", Proposito.CANCELAR, "ORD-1", limite);
        String fuera = ReflectionTestUtils.invokeMethod(service, "firmaV2", Proposito.CANCELAR, "ORD-1", limite + 1);
        assertThat(service.esValido("ORD-1", "v2." + limite + "." + ok)).isTrue();
        assertThat(service.esValido("ORD-1", "v2." + (limite + 1) + "." + fuera)).isFalse();
    }

    @Test
    void perfilProdSinClaveFallaCerradoAunqueAppUrlSeaLocal() {
        org.springframework.mock.env.MockEnvironment env = new org.springframework.mock.env.MockEnvironment();
        env.setActiveProfiles("production");
        GuestCancelTokenService s = nuevo("", "");
        ReflectionTestUtils.setField(s, "environment", env);
        assertThatThrownBy(s::validarConfig).isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("GUEST_TOKEN_SECRET");
    }

    @Test
    void esProduccionPorUrlOPerfil() {
        assertThat(GuestCancelTokenService.esProduccion("https://hotclick.lat", new String[0])).isTrue();
        assertThat(GuestCancelTokenService.esProduccion("http://localhost:8080", new String[]{"prod"})).isTrue();
        assertThat(GuestCancelTokenService.esProduccion("http://localhost:8080", new String[]{"PRODUCTION"})).isTrue();
        assertThat(GuestCancelTokenService.esProduccion("https://127.0.0.1", new String[]{"dev"})).isFalse();
        assertThat(GuestCancelTokenService.esProduccion("http://localhost:8080", null)).isFalse();
    }
}
