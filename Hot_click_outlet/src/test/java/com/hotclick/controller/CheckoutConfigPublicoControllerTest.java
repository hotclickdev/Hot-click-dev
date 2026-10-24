package com.hotclick.controller;

import com.hotclick.service.envio.ContraEntregaPolitica;
import com.hotclick.service.payment.GuestCheckoutGuard;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CheckoutConfigPublicoControllerTest {

    @Test
    void publicaMaxUnidadesSinDatosSensibles() {
        ContraEntregaPolitica politica = mock(ContraEntregaPolitica.class);
        GuestCheckoutGuard guard = mock(GuestCheckoutGuard.class);
        when(politica.habilitada()).thenReturn(true);
        when(guard.getMaxPorProducto()).thenReturn(3);

        var body = new CheckoutConfigPublicoController(politica, guard).config().getBody();

        assertThat(body).containsEntry("maxUnidadesPorProducto", 3).containsEntry("contraEntregaNormal", true);
        assertThat(body.keySet()).containsExactlyInAnyOrder(
            "contraEntregaNormal", "maxUnidadesPorProducto", "pagoPorTienda", "sinpeManual");
        assertThat(body).containsEntry("pagoPorTienda", false);
        assertThat(body).containsEntry("sinpeManual", false);
    }

    @Test
    void sinpeManualSaleDeLaConfiguracionYSoloEsBooleano() {
        ContraEntregaPolitica politica = mock(ContraEntregaPolitica.class);
        GuestCheckoutGuard guard = mock(GuestCheckoutGuard.class);
        var on = new CheckoutConfigPublicoController(politica, guard, false, true).config().getBody();
        var off = new CheckoutConfigPublicoController(politica, guard, false, false).config().getBody();
        assertThat(on).containsEntry("sinpeManual", true);
        assertThat(off).containsEntry("sinpeManual", false);
        assertThat(on.get("sinpeManual")).isInstanceOf(Boolean.class);
    }

    @Test
    void pagoPorTiendaSaleDeLaConfiguracion() {
        ContraEntregaPolitica politica = mock(ContraEntregaPolitica.class);
        GuestCheckoutGuard guard = mock(GuestCheckoutGuard.class);
        var body = new CheckoutConfigPublicoController(politica, guard, true).config().getBody();
        assertThat(body).containsEntry("pagoPorTienda", true);
    }
}
