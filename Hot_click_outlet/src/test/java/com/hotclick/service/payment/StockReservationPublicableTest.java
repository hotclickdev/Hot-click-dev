package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** ESC-1: el checkout rechaza en el servidor lo que el catálogo público no muestra. */
class StockReservationPublicableTest {

    private Producto producto(int estado, boolean visible, Empresa e) {
        Producto p = new Producto();
        p.setEstado(estado);
        p.setVisibleCatalogo(visible);
        p.setEmpresa(e);
        return p;
    }

    private Empresa empresa(String estado, boolean publica) {
        Empresa e = new Empresa();
        e.setEstadoEmpresa(estado);
        e.setVisibilidadPublica(publica);
        return e;
    }

    @Test
    @DisplayName("ESC-1 | activo, visible y negocio ACTIVO público → se puede comprar")
    void publicable() {
        assertThat(StockReservationService.esPublicableEnMemoria(
            producto(Constants.ESTADO_ACTIVO, true, empresa("ACTIVO", true)))).isTrue();
        assertThat(StockReservationService.esPublicableEnMemoria(
            producto(Constants.ESTADO_ACTIVO, true, null))).isTrue();
    }

    @Test
    @DisplayName("ESC-1 | borrado, inactivo, oculto, negocio pendiente u oculto → no se puede comprar")
    void noPublicable() {
        Empresa ok = empresa("ACTIVO", true);
        assertThat(StockReservationService.esPublicableEnMemoria(producto(Constants.ESTADO_ELIMINADO, true, ok))).isFalse();
        assertThat(StockReservationService.esPublicableEnMemoria(producto(0, true, ok))).isFalse();
        assertThat(StockReservationService.esPublicableEnMemoria(producto(Constants.ESTADO_ACTIVO, false, ok))).isFalse();
        assertThat(StockReservationService.esPublicableEnMemoria(
            producto(Constants.ESTADO_ACTIVO, true, empresa("PENDIENTE", true)))).isFalse();
        assertThat(StockReservationService.esPublicableEnMemoria(
            producto(Constants.ESTADO_ACTIVO, true, empresa("ACTIVO", false)))).isFalse();
    }
}
