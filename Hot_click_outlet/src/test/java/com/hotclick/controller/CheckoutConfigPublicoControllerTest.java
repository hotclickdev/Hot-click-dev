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
        assertThat(body.keySet()).containsExactlyInAnyOrder("contraEntregaNormal", "maxUnidadesPorProducto", "pagoPorTienda");
        assertThat(body).containsEntry("pagoPorTienda", false);
    }

    @Test
    void pagoPorTiendaSaleDeLaConfiguracion() {
        ContraEntregaPolitica politica = mock(ContraEntregaPolitica.class);
        GuestCheckoutGuard guard = mock(GuestCheckoutGuard.class);
        var body = new CheckoutConfigPublicoController(politica, guard, true).config().getBody();
        assertThat(body).containsEntry("pagoPorTienda", true);
    }
}
