package com.hotclick.repository;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Condición 1 (r3): el camino no-PostgreSQL solo con H2 + perfil test estricto; si no, fail-closed. */
class StripeEventoReservaRutaTest {

    private static MockEnvironment env(String... perfiles) {
        MockEnvironment e = new MockEnvironment();
        e.setActiveProfiles(perfiles);
        return e;
    }

    @Test
    void postgresSiempreUsaOnConflict() {
        assertThat(StripeEventoReservaImpl.decidirRuta("PostgreSQL", env("prod"))).isTrue();
        assertThat(StripeEventoReservaImpl.decidirRuta("PostgreSQL", env())).isTrue();
    }

    @Test
    void h2ConTestEstrictoUsaInsertPlano() {
        assertThat(StripeEventoReservaImpl.decidirRuta("H2", env("test"))).isFalse();
    }

    @Test
    void h2SinPerfilTestFalla() {
        assertThatThrownBy(() -> StripeEventoReservaImpl.decidirRuta("H2", env()))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> StripeEventoReservaImpl.decidirRuta("H2", env("dev")))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void h2ConTestYProdFalla() {
        assertThatThrownBy(() -> StripeEventoReservaImpl.decidirRuta("H2", env("test", "prod")))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> StripeEventoReservaImpl.decidirRuta("H2", env("test", "production")))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void otraBdFallaAunEnTest() {
        assertThatThrownBy(() -> StripeEventoReservaImpl.decidirRuta("MySQL", env("test")))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> StripeEventoReservaImpl.decidirRuta(null, env("test")))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void envNuloFalla() {
        assertThatThrownBy(() -> StripeEventoReservaImpl.decidirRuta("H2", null))
            .isInstanceOf(IllegalStateException.class);
    }
}
