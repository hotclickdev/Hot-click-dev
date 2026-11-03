package com.hotclick.controller.storefront;

import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Re-QA área 3 | M-04 pedido de invitado")
class StorefrontGuestOrderPublicableTest {

    private static Producto producto(long id, int estado, boolean visible) {
        Empresa e = new Empresa();
        e.setId(7L);
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        Producto p = new Producto();
        p.setId(id);
        p.setNombreProducto("Cojín");
        p.setEstado(estado);
        p.setVisibleCatalogo(visible);
        p.setEmpresa(e);
        return p;
    }

    @Test
    @DisplayName("M-04 | pedido de invitado rechaza producto borrado/inactivo aunque siga visible")
    void m04InvitadoValidaPublicable() {
        assertThatThrownBy(() -> StorefrontGuestOrderService.validarComprable(
            producto(1, Constants.ESTADO_ELIMINADO, true))).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> StorefrontGuestOrderService.validarComprable(
            producto(1, 0, true))).isInstanceOf(IllegalStateException.class);
        Producto negocioOculto = producto(1, Constants.ESTADO_ACTIVO, true);
        negocioOculto.getEmpresa().setVisibilidadPublica(false);
        assertThatThrownBy(() -> StorefrontGuestOrderService.validarComprable(negocioOculto))
            .isInstanceOf(IllegalStateException.class);
        StorefrontGuestOrderService.validarComprable(producto(1, Constants.ESTADO_ACTIVO, true));
    }

}
