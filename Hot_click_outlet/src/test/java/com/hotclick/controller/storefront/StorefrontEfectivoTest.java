package com.hotclick.controller.storefront;

import com.hotclick.model.Bodega;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StorefrontEfectivoTest {

    private static Bodega bodega(Boolean acepta) {
        Bodega b = new Bodega();
        b.setAceptaEfectivo(acepta);
        return b;
    }

    @Test
    void rechazaEfectivoSiLaBodegaNoLoAcepta() {
        assertThatThrownBy(() -> StorefrontGuestOrderService.exigirEfectivoAceptado("EFECTIVO", bodega(false)))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> StorefrontGuestOrderService.exigirEfectivoAceptado("efectivo", bodega(null)))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void aceptaEfectivoPermitidoYOtrosMetodos() {
        assertThatCode(() -> StorefrontGuestOrderService.exigirEfectivoAceptado("EFECTIVO", bodega(true))).doesNotThrowAnyException();
        assertThatCode(() -> StorefrontGuestOrderService.exigirEfectivoAceptado("SINPE_MOVIL", bodega(false))).doesNotThrowAnyException();
    }
}
