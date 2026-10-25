package com.hotclick.service.payment;

import com.hotclick.model.Producto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** M-07: una sola regla de oferta para catálogo, carrito, checkout y POS. */
class PrecioEfectivoOfertaTest {

    private static Producto p(int venta, Boolean enOferta, Integer oferta) {
        Producto p = new Producto();
        p.setPrecioVenta(venta);
        p.setEnOferta(enOferta);
        p.setPrecioOferta(oferta);
        return p;
    }

    @Test
    @DisplayName("M-07 | oferta válida (0 < oferta < normal) → se cobra la oferta")
    void ofertaValida() {
        assertThat(OrderPricingService.precioEfectivo(p(8900, true, 7900))).isEqualTo(7900);
        assertThat(p(8900, true, 7900).getPrecioEfectivo()).isEqualTo(7900);
    }

    @Test
    @DisplayName("M-07 | oferta ≥ normal, ≤ 0, nula o apagada → precio normal")
    void ofertaInvalidaUsaNormal() {
        assertThat(OrderPricingService.precioEfectivo(p(8900, true, 8900))).isEqualTo(8900);
        assertThat(OrderPricingService.precioEfectivo(p(8900, true, 9900))).isEqualTo(8900);
        assertThat(OrderPricingService.precioEfectivo(p(8900, true, 0))).isEqualTo(8900);
        assertThat(OrderPricingService.precioEfectivo(p(8900, true, -4450))).isEqualTo(8900);
        assertThat(OrderPricingService.precioEfectivo(p(8900, true, null))).isEqualTo(8900);
        assertThat(OrderPricingService.precioEfectivo(p(8900, false, 7900))).isEqualTo(8900);
        // POS usa Producto.getPrecioEfectivo(): misma regla
        assertThat(p(8900, true, 9900).getPrecioEfectivo()).isEqualTo(8900);
    }

    @Test
    @DisplayName("M-07 | descuento > 100 % o que deja el precio en ≤ 0 se rechaza al guardar")
    void validarOferta() {
        assertThatThrownBy(() -> OrderPricingService.calcularPrecioOferta(8900, 150))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> OrderPricingService.calcularPrecioOferta(8900, 100))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(OrderPricingService.calcularPrecioOferta(10000, 25)).isEqualTo(7500);
        assertThatThrownBy(() -> OrderPricingService.validarPrecioOferta(8900, 0))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> OrderPricingService.validarPrecioOferta(8900, 8900))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatCode(() -> OrderPricingService.validarPrecioOferta(8900, 7900)).doesNotThrowAnyException();
    }
}
