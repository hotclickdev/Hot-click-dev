package com.hotclick.utils;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FormatoColonesTest {

    @Test
    void miles_usaPuntoSinEspacios() {
        assertThat(FormatoColones.miles(6200)).isEqualTo("6.200");
        assertThat(FormatoColones.miles(1234567L)).isEqualTo("1.234.567");
        assertThat(FormatoColones.miles(999)).isEqualTo("999");
        assertThat(FormatoColones.miles(15900)).doesNotContain("\u00a0", "\u202f", " ", ",");
    }

    @Test
    void miles_nullEsCero() {
        assertThat(FormatoColones.miles(null)).isEqualTo("0");
    }

    @Test
    void colones_prefijaSimboloPegado() {
        assertThat(FormatoColones.colones(6200)).isEqualTo("₡6.200");
        assertThat(FormatoColones.colones(null)).isEqualTo("₡0");
    }
}
