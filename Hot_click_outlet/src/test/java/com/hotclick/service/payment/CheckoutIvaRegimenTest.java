package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.service.CuponService;
import com.hotclick.service.GiftCardService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DisplayName("Checkout — M4: IVA según régimen y tipo de comprobante")
class CheckoutIvaRegimenTest {

    private static Empresa empresa(String regimen) {
        Empresa e = new Empresa(); e.setId(7L); e.setRegimenIva(regimen); return e;
    }

    private static PaymentCheckoutRequest req(Boolean factura, int cantidad) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        PaymentCheckoutRequest.ItemDTO it = new PaymentCheckoutRequest.ItemDTO();
        it.setProductoId(3L); it.setCantidad(cantidad);
        r.setItems(List.of(it));
        r.setFacturaElectronica(factura);
        return r;
    }

    private static CheckoutPaquetesPlanner.Paquete planear(Empresa e, Boolean factura, int cantidad) {
        Bodega b = new Bodega(); b.setId(70L); b.setEmpresa(e);
        Producto p = new Producto(); p.setId(3L); p.setEmpresa(e); p.setPrecioVenta(5000);
        p.setNombreProducto("Taza"); p.setPorcentajeIva(new BigDecimal("13.00"));
        return new CheckoutPaquetesPlanner().planificar(req(factura, cantidad), Map.of(3L, p), b).get(0);
    }

    private static OrderPricingService pricing() {
        OrderPricingService s = new OrderPricingService();
        ReflectionTestUtils.setField(s, "cuponService", mock(CuponService.class));
        ReflectionTestUtils.setField(s, "giftCardService", mock(GiftCardService.class));
        return s;
    }

    private static int total(PaymentCheckoutRequest r, CheckoutPaquetesPlanner.Paquete paq) {
        return pricing().calcularPaquete(r, paq.bodega(), paq.subtotal(), "RETIRO", Integer.MAX_VALUE, paq.impuesto()).total()
            - pricing().calcularCostoEnvio("RETIRO");
    }

    @Test
    @DisplayName("simplificado + tiquete (default, sin bandera): cobra el precio tal cual")
    void tiquete() {
        var paq = planear(empresa("SIMPLIFICADO"), null, 2);
        assertThat(paq.impuesto()).isZero();
        assertThat(total(req(null, 2), paq)).isEqualTo(10000);
    }

    @Test
    @DisplayName("simplificado + factura: cobra precio + 13 %")
    void factura() {
        var paq = planear(empresa("SIMPLIFICADO"), true, 2);
        assertThat(paq.impuesto()).isEqualTo(1300);
        assertThat(total(req(true, 2), paq)).isEqualTo(11300);
    }

    @Test
    @DisplayName("tradicional + factura: no suma IVA")
    void tradicional() {
        var paq = planear(empresa("TRADICIONAL"), true, 1);
        assertThat(paq.impuesto()).isZero();
        assertThat(total(req(true, 1), paq)).isEqualTo(5000);
    }
}
