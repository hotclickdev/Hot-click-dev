package com.hotclick.service.envio;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ContraEntregaPermiteEfectivoTest {

    @Test
    void bodegaQueAceptaSiempre() {
        assertThat(ContraEntregaPolitica.permiteEfectivo(true, "ENVIO_RAPIDO", false)).isTrue();
    }

    @Test
    void envioNormalConContraEntrega() {
        assertThat(ContraEntregaPolitica.permiteEfectivo(false, "ENVIO_NORMAL_GAM", true)).isTrue();
        assertThat(ContraEntregaPolitica.permiteEfectivo(false, "DOMICILIO", true)).isTrue();
    }

    @Test
    void sinConfigOEnvioRapidoNo() {
        assertThat(ContraEntregaPolitica.permiteEfectivo(false, "ENVIO_NORMAL_GAM", false)).isFalse();
        assertThat(ContraEntregaPolitica.permiteEfectivo(false, "ENVIO_RAPIDO", true)).isFalse();
    }
}
