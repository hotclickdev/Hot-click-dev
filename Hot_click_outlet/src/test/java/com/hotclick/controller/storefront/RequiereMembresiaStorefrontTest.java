package com.hotclick.controller.storefront;

import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("StorefrontGuestOrder no vende una tienda sin membresia confirmada")
class RequiereMembresiaStorefrontTest {

    @Test
    void validarComprable_rechazaRequiereMembresia() {
        Producto producto = new Producto();
        producto.setNombreProducto("Sin membresia");
        producto.setEstado(Constants.ESTADO_ACTIVO);
        producto.setVisibleCatalogo(true);
        Empresa empresa = new Empresa();
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setVisibilidadPublica(true);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        producto.setEmpresa(empresa);

        assertThatThrownBy(() -> StorefrontGuestOrderService.validarComprable(producto))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("no disponible");
    }
}
