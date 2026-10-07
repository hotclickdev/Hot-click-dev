package com.hotclick.service.consola;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TiendaRapidaReglasTest {

    @Test
    void elPlazoSoloAceptaTreintaOSesenta() {
        assertThat(TiendaRapidaReglas.dias(30)).isEqualTo(30);
        assertThat(TiendaRapidaReglas.dias(60)).isEqualTo(60);
        assertThatThrownBy(() -> TiendaRapidaReglas.dias(45))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("El plazo es de 30 o 60 días.");
    }

    @Test
    void elTelefonoDeCostaRicaQuedaEnOchoDigitos() {
        assertThat(TiendaRapidaReglas.telefono("8888-0000")).isEqualTo("88880000");
        assertThat(TiendaRapidaReglas.telefono("+506 8888 0000")).isEqualTo("88880000");
        assertThatThrownBy(() -> TiendaRapidaReglas.telefono("123"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void laCedulaYElEnlaceTienenFormaCerrada() {
        assertThat(TiendaRapidaReglas.cedula("1-2345-6789")).isEqualTo("123456789");
        assertThatThrownBy(() -> TiendaRapidaReglas.token("corto")).isInstanceOf(IllegalArgumentException.class);
    }
}
