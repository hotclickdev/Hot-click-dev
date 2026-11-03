package com.hotclick.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.env.MockEnvironment;

@DisplayName("URL pública (app.url): en prod/staging no puede ser localhost ni quedar fija en el código")
class UrlPublicaArranqueGuardTest {

    private static MockEnvironment env(String... perfiles) {
        MockEnvironment e = new MockEnvironment();
        e.setActiveProfiles(perfiles);
        return e;
    }

    @ParameterizedTest
    @ValueSource(strings = {"prod", "production", "staging"})
    void enPerfilPublicoRechazaLocalhostVacioHttpEIp(String perfil) {
        for (String url : new String[] {"http://localhost:8080", "https://localhost:8080", "http://localhost:3000",
            "", "   ", "https://127.0.0.1", "https://203.0.113.10", "https://[::1]:8080", "http://hotclick.lat",
            "hotclick.lat", "https://miservidor", "https://app.localhost", "https://"}) {
            assertThatThrownBy(() -> new UrlPublicaArranqueGuard(env(perfil), url).verificar())
                .as(perfil + " " + url)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage(UrlPublicaArranqueGuard.MENSAJE);
        }
    }

    @Test
    void enPerfilPublicoAceptaDominioHttps() {
        assertThatCode(() -> new UrlPublicaArranqueGuard(env("prod"), "https://hotclick.lat").verificar())
            .doesNotThrowAnyException();
        assertThatCode(() -> new UrlPublicaArranqueGuard(env("production"), "https://hotclick.lat/").verificar())
            .doesNotThrowAnyException();
        assertThatCode(() -> new UrlPublicaArranqueGuard(env("staging"), "https://staging.hotclick.lat").verificar())
            .doesNotThrowAnyException();
    }

    @Test
    void fueraDePerfilPublicoNoExige() {
        assertThatCode(() -> new UrlPublicaArranqueGuard(env("dev"), "http://localhost:8080").verificar()).doesNotThrowAnyException();
        assertThatCode(() -> new UrlPublicaArranqueGuard(env("test"), "").verificar()).doesNotThrowAnyException();
        assertThatCode(() -> new UrlPublicaArranqueGuard(env(), "http://localhost:3000").verificar()).doesNotThrowAnyException();
    }

    @Test
    void elMensajeNoImprimeElValorConfigurado() {
        assertThatThrownBy(() -> new UrlPublicaArranqueGuard(env("prod"), "https://user:clave@localhost").verificar())
            .hasMessageNotContaining("clave");
    }

    @Test
    @DisplayName("application.properties: app.url sale de APP_URL con https://hotclick.lat por defecto y prod no lo pisa con localhost")
    void configBaseNoFijaLocalhost() throws IOException {
        assertThat(cargar("application.properties").getProperty("app.url")).isEqualTo("${APP_URL:https://hotclick.lat}");
        for (String f : new String[] {"application-prod.properties", "application-production.properties"}) {
            String v = cargar(f).getProperty("app.url");
            assertThat(v == null || !v.contains("localhost")).as(f).isTrue();
        }
    }

    private static Properties cargar(String nombre) throws IOException {
        Properties p = new Properties();
        try (InputStream in = UrlPublicaArranqueGuardTest.class.getClassLoader().getResourceAsStream(nombre)) {
            assertThat(in).as(nombre).isNotNull();
            p.load(in);
        }
        return p;
    }
}
