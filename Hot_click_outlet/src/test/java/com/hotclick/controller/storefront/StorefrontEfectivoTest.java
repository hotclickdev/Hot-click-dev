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
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> StorefrontGuestOrderService.exigirEfectivoAceptado("efectivo", bodega(null)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aceptaEfectivoPermitidoYOtrosMetodos() {
        assertThatCode(() -> StorefrontGuestOrderService.exigirEfectivoAceptado("EFECTIVO", bodega(true))).doesNotThrowAnyException();
        assertThatCode(() -> StorefrontGuestOrderService.exigirEfectivoAceptado("SINPE_MOVIL", bodega(false))).doesNotThrowAnyException();
    }

    @Test
    void rechazaRetiroSiNingunaBodegaLoOfrece() {
        Bodega sin = new Bodega();
        sin.setPermiteRetiroCliente(false);
        assertThatThrownBy(() -> StorefrontGuestOrderService.exigirRetiroDisponible("RETIRO", java.util.List.of(sin)))
            .isInstanceOf(IllegalArgumentException.class);
        Bodega con = new Bodega();
        con.setPermiteRetiroCliente(true);
        assertThatCode(() -> StorefrontGuestOrderService.exigirRetiroDisponible("RETIRO", java.util.List.of(sin, con))).doesNotThrowAnyException();
        assertThatCode(() -> StorefrontGuestOrderService.exigirRetiroDisponible("DOMICILIO", java.util.List.of())).doesNotThrowAnyException();
    }
}
