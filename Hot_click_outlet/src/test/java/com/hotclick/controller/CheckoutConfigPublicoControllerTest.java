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
            "contraEntregaNormal", "maxUnidadesPorProducto", "pagoPorTienda", "sinpeManual", "sinpeDestino", "tarjetaOnvo");
        assertThat(body).containsEntry("sinpeDestino", "");
        assertThat(body).containsEntry("pagoPorTienda", false);
        assertThat(body).containsEntry("sinpeManual", false);
    }

    @Test
    void sinpeManualSaleDeLaConfiguracionYSoloEsBooleano() {
        ContraEntregaPolitica politica = mock(ContraEntregaPolitica.class);
        GuestCheckoutGuard guard = mock(GuestCheckoutGuard.class);
        var on = new CheckoutConfigPublicoController(politica, guard, false, true).conSinpeDestino("DESTINO_ONVO_PRUEBA").config().getBody();
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

    @Test
    void tarjetaOnvoFailClosed() {
        ContraEntregaPolitica politica = mock(ContraEntregaPolitica.class);
        GuestCheckoutGuard guard = mock(GuestCheckoutGuard.class);
        assertThat(new CheckoutConfigPublicoController(politica, guard).config().getBody()).containsEntry("tarjetaOnvo", false);
        assertThat(new CheckoutConfigPublicoController(politica, guard, false, false, true).config().getBody()).containsEntry("tarjetaOnvo", true);
        com.hotclick.service.OnvoService onvo = mock(com.hotclick.service.OnvoService.class);
        org.mockito.Mockito.when(onvo.isPagosDisponibles()).thenReturn(false);
        @SuppressWarnings("unchecked")
        org.springframework.beans.factory.ObjectProvider<com.hotclick.service.OnvoService> prov = mock(org.springframework.beans.factory.ObjectProvider.class);
        org.mockito.Mockito.when(prov.getIfAvailable()).thenReturn(onvo);
        assertThat(new CheckoutConfigPublicoController(politica, guard, false, false, true, prov).config().getBody()).containsEntry("tarjetaOnvo", false);
        org.mockito.Mockito.when(onvo.isPagosDisponibles()).thenReturn(true);
        assertThat(new CheckoutConfigPublicoController(politica, guard, false, false, false, prov).config().getBody()).containsEntry("tarjetaOnvo", false);
        assertThat(new CheckoutConfigPublicoController(politica, guard, false, false, true, prov).config().getBody()).containsEntry("tarjetaOnvo", true);
    }

    @Test
    void sinpeManualSinDestinoOnvoQuedaApagado() {
        ContraEntregaPolitica politica = mock(ContraEntregaPolitica.class);
        GuestCheckoutGuard guard = mock(GuestCheckoutGuard.class);
        var body = new CheckoutConfigPublicoController(politica, guard, false, true).config().getBody();
        assertThat(body).containsEntry("sinpeManual", false).containsEntry("sinpeDestino", "");
    }
}
