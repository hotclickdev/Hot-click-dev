package com.hotclick.utils;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class CoordenadaMapaTest {

    @Test
    void aceptaUnPinDeCostaRica() {
        BigDecimal[] punto = CoordenadaMapa.parsear("9.928069", "-84.090725");
        assertThat(punto).isNotNull();
        assertThat(punto[0]).isEqualByComparingTo("9.92806900");
        assertThat(punto[1]).isEqualByComparingTo("-84.09072500");
    }

    @Test
    void rechazaTextoQueNoEsCoordenada() {
        assertThat(CoordenadaMapa.parsear("abc", "-84.1")).isNull();
        assertThat(CoordenadaMapa.parsear("91", "-84.1")).isNull();
        assertThat(CoordenadaMapa.parsear("9.9", "")).isNull();
    }
}
