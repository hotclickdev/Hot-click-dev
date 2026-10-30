package com.hotclick.service.hacienda;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CedulaEmisorTest {

    @Test
    void quitaGuionesYEspacios() {
        assertThat(CedulaEmisor.normalizar("3-101-123456")).isEqualTo("3101123456");
        assertThat(CedulaEmisor.normalizar("1-2345-6789")).isEqualTo("123456789");
        assertThat(CedulaEmisor.normalizar(" 3 101 123456 ")).isEqualTo("3101123456");
        assertThat(CedulaEmisor.normalizar("123456789012")).isEqualTo("123456789012");
    }

    @Test
    void rechazaVaciaLetrasYLargoInvalidoSinFiltrarElValor() {
        for (String mala : new String[] {null, " ", "3-101-ABC456", "12345678", "1234567890123", "3.101.123456"}) {
            assertThatThrownBy(() -> CedulaEmisor.normalizar(mala))
                .isInstanceOf(HaciendaConfiguracionException.class)
                .satisfies(e -> {
                    if (mala != null && !mala.isBlank()) assertThat(e.getMessage()).doesNotContain(mala);
                });
        }
    }
}
