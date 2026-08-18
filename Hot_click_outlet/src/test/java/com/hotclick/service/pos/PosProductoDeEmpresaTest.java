package com.hotclick.service.pos;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

@DisplayName("POS solo vende productos del negocio")
class PosProductoDeEmpresaTest {

    @Test
    @DisplayName("Rechaza un producto de otro tenant")
    void rechazaOtroNegocio() {
        assertThatThrownBy(() -> PosProductoDeEmpresa.exigirMismoNegocio(2L, 1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("no pertenece");
    }

    @Test
    @DisplayName("Rechaza un producto sin empresa")
    void rechazaSinEmpresa() {
        assertThatThrownBy(() -> PosProductoDeEmpresa.exigirMismoNegocio(null, 1L))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Acepta un producto del mismo negocio")
    void aceptaMismoNegocio() {
        assertThatCode(() -> PosProductoDeEmpresa.exigirMismoNegocio(7L, 7L))
            .doesNotThrowAnyException();
    }
}
