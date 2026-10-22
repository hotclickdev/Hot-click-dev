package com.hotclick.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("ProductionConfigValidator — CORS fail-closed en prod")
class ProductionConfigValidatorCorsTest {

    private static ProductionConfigValidator validador(String appUrl, String cors) {
        var v = new ProductionConfigValidator();
        ReflectionTestUtils.setField(v, "jwtSecret", "x".repeat(64));
        ReflectionTestUtils.setField(v, "totpEncryptionKey", "a".repeat(64));
        ReflectionTestUtils.setField(v, "appUrl", appUrl);
        ReflectionTestUtils.setField(v, "corsOrigins", cors);
        ReflectionTestUtils.setField(v, "s3Bucket", "");
        return v;
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "*", "https://hotclick.lat,http://localhost:3000", "http://127.0.0.1:3000",
        "http://hotclick.lat", "https://[::1]:3000", "https://0.0.0.0", "https://10.0.0.5", "https://172.16.4.1",
        "https://172.31.255.255", "https://192.168.1.10:3000", "https://127.8.8.8", "https://169.254.169.254",
        "https://[fc00::1]", "https://[fd12:3456::1]", "https://[fe80::1]", "https://app.localhost",
        "https://2130706433", "https://0177.0.0.1", "https://0x7f.1", "https://127.1", "https://8.8.8.8",
        "https://localhost.", "https://LOCALHOST", "https://hotclick.lat,https://localhost..", "https://a@hotclick.lat",
        "https://hotclick.lat/", "https://hotclick.lat/app", "https://hotclick.lat?x=1", "https://hotclick.lat#f",
        "https://100.64.0.1", "https://100.127.255.255", "https://[::ffff:100.64.0.1]", "https://[::ffff:127.0.0.1]",
        "https://www.0x10", "https://foo.123"})
    @DisplayName("prod con CORS inválido → aborta el arranque")
    void prodAborta(String cors) {
        assertThatThrownBy(() -> validador("https://hotclick.lat", cors).onApplicationEvent(null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("CORS_ALLOWED_ORIGINS");
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://hotclick.lat", "https://hotclick.lat,https://www.hotclick.lat", "https://hotclick.lat:8443", "https://100.hotclick.lat", "https://hotclick.lat."})
    @DisplayName("prod con CORS válido → no aborta por CORS")
    void prodValido(String cors) {
        assertThatCode(() -> validador("https://hotclick.lat", cors).onApplicationEvent(null)).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "http://localhost:3000"})
    @DisplayName("dev (app.url localhost) → no aborta")
    void devNoAborta(String cors) {
        assertThatCode(() -> validador("http://localhost:3000", cors).onApplicationEvent(null)).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(strings = {"prod", "production", "dev,prod", " PRODUCTION "})
    @DisplayName("perfil prod/production con app.url localhost → igual aborta")
    void perfilProdAborta(String perfiles) {
        var v = validador("http://localhost:3000", "");
        ReflectionTestUtils.setField(v, "perfilesActivos", perfiles);
        assertThatThrownBy(() -> v.onApplicationEvent(null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("CORS_ALLOWED_ORIGINS");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "dev", "test", "preprod", "dev,production-like"})
    @DisplayName("perfil no prod con app.url localhost → no aborta")
    void perfilNoProdNoAborta(String perfiles) {
        var v = validador("http://localhost:3000", "");
        ReflectionTestUtils.setField(v, "perfilesActivos", perfiles);
        assertThatCode(() -> v.onApplicationEvent(null)).doesNotThrowAnyException();
    }

    @org.junit.jupiter.api.Test
    @DisplayName("esProduccion: basta cualquiera de las dos señales")
    void cualquierSenal() {
        org.assertj.core.api.Assertions.assertThat(ProductionConfigValidator.esProduccion("https://hotclick.lat", null)).isTrue();
        org.assertj.core.api.Assertions.assertThat(ProductionConfigValidator.esProduccion("http://localhost:3000", "prod")).isTrue();
        org.assertj.core.api.Assertions.assertThat(ProductionConfigValidator.esProduccion(null, "production")).isTrue();
        org.assertj.core.api.Assertions.assertThat(ProductionConfigValidator.esProduccion("http://localhost:3000", "dev")).isFalse();
    }
}
