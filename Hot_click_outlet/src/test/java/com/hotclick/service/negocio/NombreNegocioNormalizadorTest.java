package com.hotclick.service.negocio;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NombreNegocioNormalizadorTest {

    @Test
    void mayusculasTildesYEspacios() {
        assertThat(NombreNegocioNormalizador.normalizar("  Café   LA  Ñapa "))
            .isEqualTo(NombreNegocioNormalizador.normalizar("cafe la ñapa"))
            .isEqualTo("cafe la ñapa");
        assertThat(NombreNegocioNormalizador.normalizar("Pana")).isNotEqualTo(NombreNegocioNormalizador.normalizar("Paña"));
    }
}
