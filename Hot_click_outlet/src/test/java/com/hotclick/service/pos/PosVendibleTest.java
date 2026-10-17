package com.hotclick.service.pos;

import com.hotclick.model.Producto;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("POS | no vende productos eliminados ni «a cotizar» (565, NP-11)")
class PosVendibleTest {

    private static Producto producto(int estado, boolean personalizado, String modo) {
        Producto p = new Producto();
        p.setNombreProducto("X");
        p.setEstado(estado);
        p.setEsPersonalizado(personalizado);
        p.setModoPrecioPersonalizado(modo);
        return p;
    }

    @Test
    void eliminadoNoSeVende() {
        assertThatThrownBy(() -> PosVentaService.exigirVendiblePorPos(producto(Constants.ESTADO_INACTIVO, false, null)))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("eliminado");
    }

    @Test
    void aCotizarNoSeVende() {
        assertThatThrownBy(() -> PosVentaService.exigirVendiblePorPos(producto(Constants.ESTADO_ACTIVO, true, "COTIZACION")))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("cotizar");
    }

    @Test
    void activoConPrecioSeVende() {
        assertThatCode(() -> PosVentaService.exigirVendiblePorPos(producto(Constants.ESTADO_ACTIVO, true, "FIJO"))).doesNotThrowAnyException();
        assertThatCode(() -> PosVentaService.exigirVendiblePorPos(producto(Constants.ESTADO_ACTIVO, false, null))).doesNotThrowAnyException();
    }
}
