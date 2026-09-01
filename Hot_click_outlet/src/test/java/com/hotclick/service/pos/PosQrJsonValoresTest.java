package com.hotclick.service.pos;

import com.hotclick.model.Usuario;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Valores JSON del QR POS")
class PosQrJsonValoresTest {

    @Test
    @DisplayName("enteroDe acepta número y string")
    void enteroDeNumeroYString() {
        assertThat(PosQrSessionService.enteroDe(Map.of("cantidad", 2), "cantidad", 1)).isEqualTo(2);
        assertThat(PosQrSessionService.enteroDe(Map.of("cantidad", "3"), "cantidad", 1)).isEqualTo(3);
        assertThat(PosQrSessionService.enteroDe(Map.of(), "cantidad", 1)).isEqualTo(1);
    }

    @Test
    @DisplayName("longOpcional lee clienteId del body del POS")
    void longOpcionalClienteId() {
        assertThat(PosQrSessionService.longOpcional(42)).isEqualTo(42L);
        assertThat(PosQrSessionService.longOpcional("7")).isEqualTo(7L);
        assertThat(PosQrSessionService.longOpcional(null)).isNull();
        assertThat(PosQrSessionService.longOpcional("")).isNull();
    }
}

@DisplayName("Nota del pedido QR indica el cajero")
class PosQrNotaCajeroTest {

    @Test
    @DisplayName("Usa el nombre del emprendedor logueado")
    void usaNombreDelCajero() {
        Usuario cajero = new Usuario();
        cajero.setNombre("Ana Emprendedora");
        cajero.setCorreo("ana@tienda.cr");
        assertThat(PosQrPedidoFactory.notaConCajero(null, cajero)).isEqualTo("Cajero: Ana Emprendedora");
        assertThat(PosQrPedidoFactory.notaConCajero("Promo", cajero)).isEqualTo("Promo · Cajero: Ana Emprendedora");
    }

    @Test
    @DisplayName("correoCajero tolera cajero nulo")
    void correoCajeroSinSesion() {
        assertThat(PosQrPedidoFactory.correoCajero(null)).isEqualTo("pos@hotclick.local");
        Usuario cajero = new Usuario();
        cajero.setCorreo("ana@tienda.cr");
        assertThat(PosQrPedidoFactory.correoCajero(cajero)).isEqualTo("ana@tienda.cr");
    }
}
