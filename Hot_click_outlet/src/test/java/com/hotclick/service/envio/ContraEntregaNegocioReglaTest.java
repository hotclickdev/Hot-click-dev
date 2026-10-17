package com.hotclick.service.envio;

import com.hotclick.model.Empresa;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ContraEntregaNegocioReglaTest {

    private static Empresa empresa(boolean acepta, Integer minimo) {
        Empresa e = new Empresa();
        e.setAceptaContraEntrega(acepta);
        e.setContraEntregaMinimoCrc(minimo);
        return e;
    }

    @Test
    void sinNegocio_noRestringe() {
        assertThat(ContraEntregaPolitica.negocioPermite(null, 100)).isTrue();
    }

    @Test
    void noAcepta_bloquea() {
        assertThat(ContraEntregaPolitica.negocioPermite(empresa(false, null), 100000)).isFalse();
    }

    @Test
    void minimo_seRespeta() {
        assertThat(ContraEntregaPolitica.negocioPermite(empresa(true, 5000), 4999)).isFalse();
        assertThat(ContraEntregaPolitica.negocioPermite(empresa(true, 5000), 5000)).isTrue();
        assertThat(ContraEntregaPolitica.negocioPermite(empresa(true, 5000), null)).isFalse();
        assertThat(ContraEntregaPolitica.negocioPermite(empresa(true, null), 1)).isTrue();
    }

    @Test
    void empresaNueva_aceptaPorDefecto() {
        assertThat(new Empresa().isAceptaContraEntrega()).isTrue();
    }
}
