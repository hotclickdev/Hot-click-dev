package com.hotclick.service.sinpe;

import com.hotclick.model.Bodega;
import com.hotclick.model.Pedido;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EfectivoAceptadoTest {

    private static Pedido pedido(boolean aceptaEfectivo) {
        Bodega bodega = new Bodega();
        bodega.setAceptaEfectivo(aceptaEfectivo);
        Pedido pedido = new Pedido();
        pedido.setBodega(bodega);
        return pedido;
    }

    @Test
    void efectivoConUnaBodegaQueNoLoAceptaSeRechaza() {
        assertThatThrownBy(() -> SinpeCheckoutService.exigirEfectivoAceptado("EFECTIVO", List.of(pedido(true), pedido(false))))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void efectivoConTodasLasBodegasPasaYSinpeNoSeRevisa() {
        assertThatCode(() -> SinpeCheckoutService.exigirEfectivoAceptado("EFECTIVO", List.of(pedido(true), pedido(true)))).doesNotThrowAnyException();
        assertThatCode(() -> SinpeCheckoutService.exigirEfectivoAceptado("SINPE", List.of(pedido(false)))).doesNotThrowAnyException();
    }
}
