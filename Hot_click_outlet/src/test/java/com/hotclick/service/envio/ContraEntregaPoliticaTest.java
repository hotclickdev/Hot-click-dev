package com.hotclick.service.envio;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ContraEntregaPoliticaTest {

    @Test
    void porDefectoSeCobraElPedidoCompletoEnEnvioNormal() {
        ContraEntregaPolitica p = new ContraEntregaPolitica("");
        assertThat(p.modoNormal()).isEqualTo(ContraEntregaPolitica.PEDIDO_COMPLETO);
        assertThat(p.montoAlEntregar("ENVIO_NORMAL_GAM", 24_000, 4_000)).isEqualTo(24_000);
        assertThat(p.montoAlEntregar("ENVIO_RAPIDO", 24_000, 5_000)).isZero();
    }

    @Test
    void soloEnvioCobraSoloElEnvio() {
        ContraEntregaPolitica p = new ContraEntregaPolitica("solo_envio");
        assertThat(p.montoAlEntregar("ENVIO_NORMAL_FUERA_GAM", 24_000, 4_000)).isEqualTo(4_000);
    }
}
