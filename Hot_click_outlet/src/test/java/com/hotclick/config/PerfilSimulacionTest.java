package com.hotclick.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class PerfilSimulacionTest {

    private static MockEnvironment env(String... perfiles) {
        MockEnvironment e = new MockEnvironment();
        e.setActiveProfiles(perfiles);
        return e;
    }

    @Test
    void sinEnvironmentEsFailClosed() {
        assertThat(PerfilSimulacion.permitido(null)).isFalse();
    }

    @Test
    void devYTestPermiten() {
        assertThat(PerfilSimulacion.permitido(env("dev"))).isTrue();
        assertThat(PerfilSimulacion.permitido(env("test"))).isTrue();
    }

    @Test
    void prodEnCualquierFormaBloquea() {
        assertThat(PerfilSimulacion.permitido(env("dev", "PROD"))).isFalse();
        assertThat(PerfilSimulacion.permitido(env("test", " Production "))).isFalse();
        assertThat(PerfilSimulacion.permitido(env("dev", "prod"))).isFalse();
    }

    @Test
    void sinPerfilDeSimulacionBloquea() {
        assertThat(PerfilSimulacion.permitido(env())).isFalse();
        assertThat(PerfilSimulacion.permitido(env("staging"))).isFalse();
    }
}
