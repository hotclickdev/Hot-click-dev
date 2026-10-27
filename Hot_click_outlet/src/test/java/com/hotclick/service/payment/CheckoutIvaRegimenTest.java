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

    private static OrderPricingResult precio(PaymentCheckoutRequest r, CheckoutPaquetesPlanner.Paquete paq) {
        return pricing().calcularPaquete(r, paq.bodega(), paq.subtotal(), "RETIRO", Integer.MAX_VALUE, paq.lineasIva());
    }

    private static int total(PaymentCheckoutRequest r, CheckoutPaquetesPlanner.Paquete paq) {
        return precio(r, paq).total() - pricing().calcularCostoEnvio("RETIRO");
    }

    @Test
    @DisplayName("simplificado + tiquete (default, sin bandera): cobra el precio tal cual")
    void tiquete() {
        var paq = planear(empresa("SIMPLIFICADO"), null, 2);
        assertThat(precio(req(null, 2), paq).impuesto()).isZero();
        assertThat(total(req(null, 2), paq)).isEqualTo(10000);
    }

    @Test
    @DisplayName("simplificado + factura: cobra precio + 13 %")
    void factura() {
        var paq = planear(empresa("SIMPLIFICADO"), true, 2);
        assertThat(precio(req(true, 2), paq).impuesto()).isEqualTo(1300);
        assertThat(total(req(true, 2), paq)).isEqualTo(11300);
    }

    @Test
    @DisplayName("tradicional + factura: no suma IVA")
    void tradicional() {
        var paq = planear(empresa("TRADICIONAL"), true, 1);
        assertThat(precio(req(true, 1), paq).impuesto()).isZero();
        assertThat(total(req(true, 1), paq)).isEqualTo(5000);
    }

    private static OrderPricingResult conCupon(PaymentCheckoutRequest r, CheckoutPaquetesPlanner.Paquete paq, String envio) {
        CuponService cupones = mock(CuponService.class);
        com.hotclick.model.Cupon c = new com.hotclick.model.Cupon();
        c.setCodigo("PROMO10"); c.setDescuentoPorcentaje(10);
        org.mockito.Mockito.when(cupones.validarParaEmpresa("PROMO10", 7L)).thenReturn(java.util.Optional.of(c));
        OrderPricingService s = pricing();
        ReflectionTestUtils.setField(s, "cuponService", cupones);
        r.setCodigoCupon("PROMO10");
        return s.calcularPaquete(r, paq.bodega(), paq.subtotal(), envio, Integer.MAX_VALUE, paq.lineasIva());
    }

    /** Pedido como lo arma el checkout con el resultado del pricing (precio, descuento, envío e IVA). */
    private static com.hotclick.model.Pedido pedido(Empresa e, CheckoutPaquetesPlanner.Paquete paq, OrderPricingResult res) {
        com.hotclick.model.Pedido p = new com.hotclick.model.Pedido();
        p.setEmpresa(e);
        com.hotclick.model.PedidoItem it = new com.hotclick.model.PedidoItem();
        Producto prod = new Producto(); prod.setId(3L); prod.setNombreProducto("Taza");
        prod.setPorcentajeIva(new BigDecimal("13.00")); prod.setCodigoTarifaIva("08"); prod.setCodigoCabys("4321150100101");
        it.setProducto(prod); it.setCantidad(paq.items().get(0).getCantidad()); it.setPrecioUnitarioMomento(5000);
        it.setSubtotalItem(paq.subtotal()); it.setPedido(p);
        p.setItems(List.of(it));
        p.setSubtotal(paq.subtotal());
        p.setDescuentoTotal(res.descuento());
        p.setCostoEnvio(res.costoEnvio());
        p.setMontoImpuesto(res.impuesto());
        p.setTotalPedido(res.total());
        return p;
    }

    @Test
    @DisplayName("simplificado + factura con cupón y envío: IVA sobre el neto y cobro = TotalComprobante del XML")
    void facturaConCuponYEnvioCuadraConXml() {
        Empresa e = empresa("SIMPLIFICADO");
        var paq = planear(e, true, 2);
        var res = conCupon(req(true, 2), paq, "ENVIO_RAPIDO");
        assertThat(res.descuento()).isEqualTo(1000);
        assertThat(res.impuesto()).isEqualTo(1170);                 // 13 % de 9 000, no de 10 000
        assertThat(res.total()).isEqualTo(9000 + 5000 + 1170);
        assertThat(com.hotclick.service.pos.PosVentaIvaRegimenTest.totalXml(
            pedido(e, paq, res), com.hotclick.model.ComprobanteFiscal.TIPO_FACTURA)).isEqualTo(res.total());
    }

    @Test
    @DisplayName("tradicional y tiquete con cupón y envío: el XML cuadra con lo cobrado")
    void sinIvaSumadoConCuponYEnvioCuadraConXml() {
        Empresa t = empresa("TRADICIONAL");
        var paqT = planear(t, true, 3);
        var resT = conCupon(req(true, 3), paqT, "ENVIO_RAPIDO");
        assertThat(resT.impuesto()).isZero();
        assertThat(com.hotclick.service.pos.PosVentaIvaRegimenTest.totalXml(
            pedido(t, paqT, resT), com.hotclick.model.ComprobanteFiscal.TIPO_FACTURA)).isEqualTo(resT.total());

        Empresa s = empresa("SIMPLIFICADO");
        var paqS = planear(s, false, 3);
        var resS = conCupon(req(false, 3), paqS, "ENVIO_RAPIDO");
        assertThat(com.hotclick.service.pos.PosVentaIvaRegimenTest.totalXml(
            pedido(s, paqS, resS), com.hotclick.model.ComprobanteFiscal.TIPO_TIQUETE)).isEqualTo(resS.total());
    }
}
