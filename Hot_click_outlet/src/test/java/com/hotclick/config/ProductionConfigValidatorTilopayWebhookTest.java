package com.hotclick.config;

import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.annotation.Configuration;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

/** Si se retira Tilopay (plan-retiro-tilopay.md), este test se borra junto con el chequeo. */
class ProductionConfigValidatorTilopayWebhookTest {

    /** Environment con esos perfiles activos (separados por coma), como los vería Spring. */
    static org.springframework.mock.env.MockEnvironment entornoCon(String perfiles) {
        var env = new org.springframework.mock.env.MockEnvironment();
        if (perfiles != null) {
            env.setActiveProfiles(java.util.Arrays.stream(perfiles.split(",")).filter(x -> !x.isBlank()).toArray(String[]::new));
        }
        return env;
    }

    private static ProductionConfigValidator validador(String appUrl, String perfiles, String secret) {
        var v = new ProductionConfigValidator();
        ReflectionTestUtils.setField(v, "jwtSecret", "x".repeat(64));
        ReflectionTestUtils.setField(v, "totpEncryptionKey", "a".repeat(64));
        ReflectionTestUtils.setField(v, "appUrl", appUrl);
        ReflectionTestUtils.setField(v, "corsOrigins", "https://hotclick.lat");
        ReflectionTestUtils.setField(v, "s3Bucket", "");
        ReflectionTestUtils.setField(v, "webauthnSyntheticKey", java.util.Base64.getEncoder().encodeToString(new byte[32]));
        ReflectionTestUtils.setField(v, "environment", entornoCon(perfiles));
        ReflectionTestUtils.setField(v, "tilopayWebhookSecret", secret);
        return v;
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   ", "zq7-valor-test", "abcdefghijklmnopqrstuvwxyz01234"})
    @DisplayName("prod (por app.url) con secret ausente, vacío o < 32 → aborta sin mostrar el valor")
    void prodAborta(String secret) {
        assertThatThrownBy(() -> validador("https://hotclick.lat", "", secret).onApplicationEvent(null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("TILOPAY_WEBHOOK_SECRET")
            .satisfies(e -> {
                if (secret != null && !secret.isBlank()) assertThat(e.getMessage()).doesNotContain(secret);
            });
    }

    @Test
    @DisplayName("prod por perfil (app.url localhost) también aborta")
    void prodPorPerfilAborta() {
        assertThatThrownBy(() -> validador("http://localhost:3000", "prod", "").onApplicationEvent(null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("TILOPAY_WEBHOOK_SECRET");
    }

    @Test
    @DisplayName("prod con secret de 32+ caracteres → no aborta")
    void prodValido() {
        assertThatCode(() -> validador("https://hotclick.lat", "", "s".repeat(32)).onApplicationEvent(null))
            .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("dev sin secret → no aborta")
    void devNoAborta() {
        assertThatCode(() -> validador("http://localhost:3000", "dev", "").onApplicationEvent(null))
            .doesNotThrowAnyException();
    }

    @Configuration
    static class VacioConfig { }

    private static String[] perfilesEfectivos(String... props) {
        try (var ctx = new SpringApplicationBuilder(VacioConfig.class).web(WebApplicationType.NONE)
                .properties(props).run()) {
            return ctx.getEnvironment().getActiveProfiles();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"spring.profiles.include=prod", "spring.profiles.active=nube|spring.profiles.group.nube=prod"})
    @DisplayName("C-1: perfil prod vía include o grupo (Spring Boot real) → aborta sin secret")
    void prodPorIncludeOGrupoAborta(String props) {
        String[] perfiles = perfilesEfectivos(props.split("\\|"));
        var v = validador("http://localhost:3000", "", null);
        var env = new org.springframework.mock.env.MockEnvironment();
        env.setActiveProfiles(perfiles);
        ReflectionTestUtils.setField(v, "environment", env);
        assertThatThrownBy(() -> v.onApplicationEvent(null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("TILOPAY_WEBHOOK_SECRET");
    }

    @org.junit.jupiter.api.Test
    @DisplayName("C-1: perfil prod agregado programáticamente (addActiveProfile) → aborta sin secret")
    void prodPorPerfilProgramaticoAborta() {
        var v = validador("http://localhost:3000", "", null);
        var env = new org.springframework.core.env.StandardEnvironment();
        env.addActiveProfile("prod");
        ReflectionTestUtils.setField(v, "environment", env);
        assertThatThrownBy(() -> v.onApplicationEvent(null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("TILOPAY_WEBHOOK_SECRET");
    }

    @ParameterizedTest
    @ValueSource(strings = {"HTTPS://hotclick.lat", "Https://HotClick.lat/", " https://hotclick.lat "})
    @DisplayName("C-2: esquema https en mayúsculas/mixto → prod, aborta sin secret")
    void httpsMayusculasEsProd(String url) {
        org.assertj.core.api.Assertions.assertThat(ProductionConfigValidator.esUrlProduccion(url)).isTrue();
        var v = validador(url, "", null);
        assertThatThrownBy(() -> v.onApplicationEvent(null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("TILOPAY_WEBHOOK_SECRET");
    }

    @ParameterizedTest
    @ValueSource(strings = {"HTTPS://LOCALHOST:8443", "https://LocalHost", "https://127.0.0.1", "http://hotclick.lat", "HTTP://hotclick.lat", "no es url", ""})
    @DisplayName("C-2/C-3: host localhost explícito (cualquier caja), http, vacío o sin https:// → no prod")
    void noProdPorUrl(String url) {
        org.assertj.core.api.Assertions.assertThat(ProductionConfigValidator.esUrlProduccion(url)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://hotclick.lat/a b", "https://hot_click.lat/", "https://hotclick.lat:abc/",
        "https://hotclick.lat/%zz", "https://", "HTTPS://"})
    @DisplayName("C-3: https:// que no parsea o sin host → fail-closed: prod, aborta sin secret")
    void httpsNoParseableEsProd(String url) {
        org.assertj.core.api.Assertions.assertThat(ProductionConfigValidator.esUrlProduccion(url)).isTrue();
        var v = validador(url, "", null);
        assertThatThrownBy(() -> v.onApplicationEvent(null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("TILOPAY_WEBHOOK_SECRET");
    }
}
