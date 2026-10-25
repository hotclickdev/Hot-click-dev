package com.hotclick.service.sinpe;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** SINPE manual del checkout: sin destino ONVO configurado no se crea pedido (fail-closed). */
class SinpeDestinoOnvoTest {

    private static final String DESTINO = "DESTINO_ONVO_PRUEBA";

    @Test
    void sinDestinoSinpeSeRechaza() {
        assertThatThrownBy(() -> SinpeCheckoutService.exigirDestinoSiSinpe("SINPE", ""))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> SinpeCheckoutService.exigirDestinoSiSinpe(null, null))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void conDestinoSeDevuelveTalCual() {
        assertThat(SinpeCheckoutService.exigirDestinoSiSinpe("SINPE", DESTINO)).isEqualTo(DESTINO);
    }

    @Test
    void efectivoNoNecesitaDestino() {
        assertThat(SinpeCheckoutService.exigirDestinoSiSinpe("EFECTIVO", "")).isNull();
    }
}
