package com.hotclick.service.sinpe;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SinpeAprobacionGuardTest {

    @Test
    void duenoDeLaTienda_puedeAprobarCompraAjena() {
        Pedido pedido = pedido(5L, 9L, "comprador@test.com");

        assertDoesNotThrow(() -> SinpeAprobacionGuard.assertReglas(
                pedido, "tienda@test.com", 3L, false, 5L));
    }

    @Test
    void duenoQueComproEnSuTienda_noPuedeAprobar() {
        Pedido pedido = pedido(5L, 3L, "tienda@test.com");

        assertThrows(SecurityException.class, () -> SinpeAprobacionGuard.assertReglas(
                pedido, "tienda@test.com", 3L, false, 5L));
    }

    @Test
    void otraTienda_noPuedeAprobar() {
        Pedido pedido = pedido(5L, 9L, "comprador@test.com");

        assertThrows(SecurityException.class, () -> SinpeAprobacionGuard.assertReglas(
                pedido, "otra@test.com", 4L, false, 8L));
    }

    @Test
    void comprador_noPuedeAprobarSuPropiaCompraAunqueSeaAdmin() {
        Pedido pedido = pedido(5L, 9L, "comprador@test.com");

        assertThrows(SecurityException.class, () -> SinpeAprobacionGuard.assertReglas(
                pedido, "comprador@test.com", 9L, true, null));
    }

    @Test
    void adminDePlataforma_puedeAprobarOtraTienda() {
        Pedido pedido = pedido(5L, 9L, "comprador@test.com");

        assertDoesNotThrow(() -> SinpeAprobacionGuard.assertReglas(
                pedido, "admin@hotclick.com", 1L, true, null));
    }

    private static Pedido pedido(Long empresaId, Long compradorId, String correo) {
        Empresa empresa = new Empresa();
        empresa.setId(empresaId);
        Usuario comprador = new Usuario();
        comprador.setId(compradorId);
        comprador.setCorreo(correo);
        Pedido pedido = new Pedido();
        pedido.setEmpresa(empresa);
        pedido.setUsuarioFinal(comprador);
        return pedido;
    }
}
