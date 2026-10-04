package com.hotclick.legal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("MayoriaEdad")
class MayoriaEdadTest {

    @Test
    void aceptaTrueYRechazaElResto() {
        MayoriaEdad.exigir(true);
        assertThatThrownBy(() -> MayoriaEdad.exigir(false))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(MayoriaEdad.MENSAJE);
        assertThatThrownBy(() -> MayoriaEdad.exigir(null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void leeLaDeclaracionDesdeTexto() {
        assertThat(MayoriaEdad.desdeTexto("true")).isTrue();
        assertThat(MayoriaEdad.desdeTexto("1")).isTrue();
        assertThat(MayoriaEdad.desdeTexto("false")).isFalse();
        assertThat(MayoriaEdad.desdeTexto(null)).isFalse();
    }
}
