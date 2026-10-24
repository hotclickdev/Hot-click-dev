package com.hotclick.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Locale;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.env.MockEnvironment;

class ValidadorPerfilesProduccionTest {

    @ParameterizedTest
    @ValueSource(strings = {"PROD", "Prod", "PRODUCTION", " prod", "prod ", "Production"})
    void rechazaVariantesNoCanonicas(String perfil) {
        assertThatThrownBy(() -> ValidadorPerfilesProduccion.validar(new String[] {"dev", perfil}))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage(ValidadorPerfilesProduccion.MENSAJE);
    }

    @Test
    void casosExplicitosSeguridad() {
        for (String[] ps : new String[][] {{"test", "Production"}, {" prod"}, {"test", "PROD"}}) {
            assertThatThrownBy(() -> ValidadorPerfilesProduccion.validar(ps))
                    .as(String.join("+", ps))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage(ValidadorPerfilesProduccion.MENSAJE);
        }
    }

    @Test
    void aceptaPerfilesCanonicos() {
        for (String[] ps : new String[][] {{"dev"}, {"test"}, {"prod"}, {"dev", "prod"}, {"production"}, {}}) {
            assertThatCode(() -> ValidadorPerfilesProduccion.validar(ps)).doesNotThrowAnyException();
        }
    }

    @Test
    void localeTurcoNoAfecta() {
        Locale previo = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            assertThatThrownBy(() -> ValidadorPerfilesProduccion.validar(new String[] {"dev", "PRODUCTION"}))
                    .isInstanceOf(IllegalStateException.class);
            assertThatCode(() -> ValidadorPerfilesProduccion.validar(new String[] {"dev", "prod"}))
                    .doesNotThrowAnyException();
        } finally {
            Locale.setDefault(previo);
        }
    }

    @Test
    void revisaPerfilesDefault() {
        MockEnvironment env = new MockEnvironment();
        env.setDefaultProfiles("Prod");
        assertThatThrownBy(() -> new ValidadorPerfilesProduccion().postProcessEnvironment(env, null))
                .isInstanceOf(IllegalStateException.class);
    }

    @Configuration(proxyBeanMethods = false)
    static class Vacia {}

    private static SpringApplication app() {
        SpringApplication app = new SpringApplication(Vacia.class);
        app.setWebApplicationType(WebApplicationType.NONE);
        return app;
    }

    @ParameterizedTest
    @ValueSource(strings = {"dev,PROD", "test,Production"})
    void contextoNoArranca(String perfiles) {
        assertThatThrownBy(() -> app().run("--spring.profiles.active=" + perfiles, "--spring.main.banner-mode=off"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage(ValidadorPerfilesProduccion.MENSAJE);
    }

    /** Por propiedad Spring recorta " prod" a "prod": arranca como prod canonico (guardas prod activas). */
    @Test
    void espacioPorPropiedadQuedaProdCanonico() throws Exception {
        try (var ctx = app().run("--spring.profiles.active= prod", "--spring.main.banner-mode=off")) {
            org.assertj.core.api.Assertions.assertThat(ctx.getEnvironment().getActiveProfiles()).containsExactly("prod");
        }
    }

    /** Sin recorte (perfil programatico) " prod": Spring mismo lo rechaza antes; igual no arranca. */
    @Test
    void espacioSinRecorteNoArranca() {
        SpringApplication a = app();
        a.setAdditionalProfiles(" prod");
        assertThatThrownBy(() -> a.run("--spring.main.banner-mode=off"))
                .isInstanceOf(IllegalStateException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"dev,prod", "test"})
    void contextoArranca(String perfiles) {
        assertThatCode(() -> {
            try (var ctx = app().run("--spring.profiles.active=" + perfiles, "--spring.main.banner-mode=off")) {
                org.assertj.core.api.Assertions.assertThat(ctx.getEnvironment().getActiveProfiles())
                        .containsExactly(perfiles.split(","));
            }
        }).doesNotThrowAnyException();
    }
}
