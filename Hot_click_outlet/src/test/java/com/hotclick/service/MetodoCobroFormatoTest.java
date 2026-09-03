package com.hotclick.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("MetodoCobroFormato")
class MetodoCobroFormatoTest {

    @Test
    void mascara_sinpe_e_iban() {
        assertThat(MetodoCobroFormato.mascara("SINPE", "88880000")).isEqualTo("8888-0000");
        assertThat(MetodoCobroFormato.mascara("IBAN", "CR21000012344521")).contains("****");
    }

    @Test
    void tarjeta_solo_ultimos_4() {
        assertThat(MetodoCobroFormato.limpiarDestino("TARJETA", "4111111111114412")).isEqualTo("4412");
        assertThat(MetodoCobroFormato.mascara("TARJETA", "4412")).isEqualTo("•••• 4412");
    }

    @Test
    void tipo_invalido() {
        assertThatThrownBy(() -> MetodoCobroFormato.normalizarTipo("paypal"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
