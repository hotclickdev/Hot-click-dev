package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.security.TenantContext;
import com.hotclick.service.pos.PosVentaIvaRegimenTest;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * QA PR #678 (cupones retirados): totales del checkout sin cupón. Lo que se cobra (totalCobro, lo que recibe ONVO
 * como suma del grupo) tiene que ser exactamente subtotal + envío por negocio − descuento SINPE/efectivo + IVA, en
 * uno o varios negocios. Montos de envío por defecto: GAM ₡4.000, rápido ₡5.000, fuera del GAM ₡5.500.
 * Incluye un caso espejo de {@code paquetesCompra.test.ts} para que front y back sigan dando el mismo total.
 */
@DisplayName("QA #678 | checkout sin cupones: totales = cobro ONVO")
class CheckoutTotalesSinCuponesTest {

    private static final String GAM = "ENVIO_NORMAL_GAM";
    private static final String RAPIDO = "ENVIO_RAPIDO";

    @AfterEach void limpiar() { TenantContext.clear(); }

    private final Map<Long, Producto> productos = new HashMap<>();
    private final List<PaymentCheckoutRequest.ItemDTO> items = new ArrayList<>();
    private long siguienteId = 5000L;

    private static Empresa empresa(long id, String pctSinpe, String regimen) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setNombreEmpresa("N" + id);
        if (pctSinpe != null) e.setPctDescuentoSinpe(new BigDecimal(pctSinpe));
        e.setRegimenIva(regimen);
        return e;
    }

    private static Bodega bodega(long id, Empresa e) {
        Bodega b = new Bodega();
        b.setId(id);
        b.setEmpresa(e);
        b.setPermiteRetiroCliente(true);
        return b;
    }

    private Producto producto(Empresa e, Bodega b, int precioVenta, int cantidad) {
        Producto p = new Producto();
        p.setId(siguienteId);
        p.setNombreProducto("P" + siguienteId);
        p.setPrecioVenta(precioVenta);
        p.setPrecioCompra(precioVenta / 2);
        p.setPorcentajeIva(new BigDecimal("13.00"));
        p.setEmpresa(e);
        p.setBodega(b);
        productos.put(siguienteId, p);
        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(siguienteId++);
        item.setCantidad(cantidad);
        items.add(item);
        return p;
    }

    private PaymentCheckoutRequest req(String provider, String metodo) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        r.setItems(items);
        r.setProvider(provider);
        r.setMetodoEnvio(metodo);
        r.setProvincia("San José");
        r.setCanton("Escazú");
        return r;
    }

    private static PaymentCheckoutRequest.EnvioPaqueteDTO envio(long bodegaId, String metodo) {
        PaymentCheckoutRequest.EnvioPaqueteDTO e = new PaymentCheckoutRequest.EnvioPaqueteDTO();
        e.setBodegaId(bodegaId);
        e.setMetodoEnvio(metodo);
        return e;
    }

    private static CheckoutGrupoFactory factory() {
        CheckoutOrderFactory orders = mock(CheckoutOrderFactory.class);
        when(orders.crearSubpedido(any(), anyInt(), anyInt(), any(), any(), any(), any(), any(), any(), any()))
            .thenAnswer(inv -> {
                OrderPricingResult r = inv.getArgument(0);
                Pedido p = new Pedido();
                p.setSubtotal(inv.getArgument(1));
                p.setCostoEnvio(r.costoEnvio());
                p.setDescuentoTotal(r.descuento());
                p.setMontoImpuesto(r.impuesto());
                p.setTotalPedido(r.total());
                p.setBodega(inv.getArgument(5));
                p.setMetodoEnvio(inv.getArgument(6));
                return p;
            });
        return new CheckoutGrupoFactory(new CheckoutValidator(), new CheckoutPaquetesPlanner(),
            new OrderPricingService(), orders);
    }

    private CheckoutGrupoFactory.Grupo crear(PaymentCheckoutRequest r) {
        return factory().crear(r, new StockReservationResult(0, 0, productos), null, r.getProvider(), null,
            Constants.PEDIDO_PENDIENTE);
    }

    /** Invariante: lo que se cobra es la suma de los subpedidos y cada subpedido cuadra con su desglose. */
    private static void cuadra(CheckoutGrupoFactory.Grupo g) {
        assertThat(g.totalCobro()).isEqualTo(g.subpedidos().stream().mapToInt(s -> s.pricing().total()).sum());
        for (CheckoutGrupoFactory.Subpedido s : g.subpedidos()) {
            Pedido p = s.pedido();
            assertThat(p.getTotalPedido())
                .isEqualTo(p.getSubtotal() + p.getCostoEnvio() - p.getDescuentoTotal() + p.getMontoImpuesto());
            assertThat(p.getCuponCodigo()).isNull();
        }
    }

    @ParameterizedTest(name = "[{index}] un negocio, {0} con {1}: cobro {2}")
    @CsvSource({
        "ONVO,     RETIRO_EN_TIENDA, 20000, 0",
        "ONVO,     ENVIO_NORMAL_GAM, 24000, 0",
        "ONVO,     ENVIO_RAPIDO,     25000, 0",
        "SINPE,    RETIRO_EN_TIENDA, 18000, 2000",
        "SINPE,    ENVIO_NORMAL_GAM, 21600, 2400",
        "EFECTIVO, ENVIO_NORMAL_GAM, 21600, 2400",
        "STRIPE,   ENVIO_NORMAL_GAM, 24000, 0",
    })
    void unNegocio(String provider, String metodo, int cobro, int descuento) {
        Empresa a = empresa(61L, "10", "TRADICIONAL");
        producto(a, bodega(611L, a), 10_000, 2);
        CheckoutGrupoFactory.Grupo g = crear(req(provider, metodo));
        assertThat(g.subpedidos()).hasSize(1);
        assertThat(g.subpedidos().get(0).pricing().descuento()).isEqualTo(descuento);
        assertThat(g.subpedidos().get(0).pricing().impuesto()).isZero();
        assertThat(g.totalCobro()).isEqualTo(cobro);
        cuadra(g);
    }

    @Test
    @DisplayName("Espejo de paquetesCompra.test.ts: 2 negocios, GAM + rápido, SINPE 5 % solo en B → 37.750 (ONVO 39.000)")
    void dosNegociosIgualQueElFront() {
        Empresa a = empresa(7L, null, "TRADICIONAL");
        Empresa b = empresa(8L, "5", "TRADICIONAL");
        producto(a, bodega(70L, a), 10_000, 1);
        producto(b, bodega(80L, b), 10_000, 2);

        PaymentCheckoutRequest sinpe = req("SINPE", GAM);
        sinpe.setEnvios(List.of(envio(70L, GAM), envio(80L, RAPIDO)));
        CheckoutGrupoFactory.Grupo g = crear(sinpe);
        assertThat(g.subpedidos()).extracting(s -> s.pricing().costoEnvio()).containsExactly(4000, 5000);
        assertThat(g.subpedidos()).extracting(s -> s.pricing().descuento()).containsExactly(0, 1250);
        assertThat(g.totalCobro()).isEqualTo(37_750);
        cuadra(g);

        PaymentCheckoutRequest onvo = req("ONVO", GAM);
        onvo.setEnvios(List.of(envio(70L, GAM), envio(80L, RAPIDO)));
        CheckoutGrupoFactory.Grupo g2 = crear(onvo);
        assertThat(g2.totalCobro()).isEqualTo(39_000);
        cuadra(g2);
    }

    @Test
    @DisplayName("2 negocios, uno retira y otro con envío, SINPE de 10 % y 0 %: descuento por negocio")
    void dosNegociosRetiroYEnvio() {
        Empresa a = empresa(91L, "10", "TRADICIONAL");
        Empresa b = empresa(92L, "0", "TRADICIONAL");
        producto(a, bodega(910L, a), 15_000, 1);
        producto(b, bodega(920L, b), 8_000, 3);
        PaymentCheckoutRequest r = req("SINPE", Constants.ENVIO_RETIRO);
        r.setEnvios(List.of(envio(910L, Constants.ENVIO_RETIRO), envio(920L, GAM)));
        CheckoutGrupoFactory.Grupo g = crear(r);
        assertThat(g.subpedidos()).extracting(s -> s.pricing().descuento()).containsExactly(1500, 0);
        assertThat(g.totalCobro()).isEqualTo((15_000 - 1500) + (24_000 + 4000));
        cuadra(g);
    }

    @Test
    @DisplayName("IVA: simplificado + factura suma 13 % sobre el neto; el tradicional del mismo checkout no suma")
    void ivaPorNegocioEnElMismoCheckout() {
        Empresa simp = empresa(93L, "10", "SIMPLIFICADO");
        Empresa trad = empresa(94L, "10", "TRADICIONAL");
        producto(simp, bodega(930L, simp), 5_000, 2);
        producto(trad, bodega(940L, trad), 5_000, 2);
        PaymentCheckoutRequest r = req("SINPE", GAM);
        r.setFacturaElectronica(true);
        CheckoutGrupoFactory.Grupo g = crear(r);
        OrderPricingResult s = g.subpedidos().get(0).pricing();
        OrderPricingResult t = g.subpedidos().get(1).pricing();
        // Simplificado: base SINPE 10 000 + 4 000 = 14 000 → 1 400; IVA 13 % de (10 000 − 1 400) = 1 118.
        assertThat(s.descuento()).isEqualTo(1400);
        assertThat(s.impuesto()).isEqualTo(1118);
        assertThat(s.total()).isEqualTo(10_000 - 1400 + 4000 + 1118);
        assertThat(t.impuesto()).isZero();
        assertThat(t.total()).isEqualTo(10_000 - 1400 + 4000);
        assertThat(g.totalCobro()).isEqualTo(s.total() + t.total());
        cuadra(g);
    }

    @Test
    @DisplayName("IVA con ONVO (sin descuento): simplificado + factura cobra 13 % de los productos")
    void ivaSinDescuento() {
        Empresa simp = empresa(95L, "10", "SIMPLIFICADO");
        producto(simp, bodega(950L, simp), 5_000, 2);
        PaymentCheckoutRequest r = req("ONVO", GAM);
        r.setFacturaElectronica(true);
        CheckoutGrupoFactory.Grupo g = crear(r);
        assertThat(g.totalCobro()).isEqualTo(10_000 + 4000 + 1300);
        cuadra(g);
    }

    @Test
    @DisplayName("Oferta de producto: el checkout cobra el precio de oferta y el SINPE se calcula sobre él")
    void ofertaDeProducto() {
        Empresa a = empresa(96L, "10", "TRADICIONAL");
        Producto p = producto(a, bodega(960L, a), 10_000, 1);
        p.setEnOferta(true);
        p.setPrecioOferta(8_000);
        assertThat(crear(req("ONVO", Constants.ENVIO_RETIRO)).totalCobro()).isEqualTo(8_000);
        CheckoutGrupoFactory.Grupo g = crear(req("SINPE", Constants.ENVIO_RETIRO));
        assertThat(g.totalCobro()).isEqualTo(7_200);
        cuadra(g);
        // Oferta inválida (≥ precio normal): precio normal.
        p.setPrecioOferta(12_000);
        assertThat(crear(req("ONVO", Constants.ENVIO_RETIRO)).totalCobro()).isEqualTo(10_000);
    }

    // ── Pedidos históricos con cupón ─────────────────────────────────────────

    /** Pedido histórico de 2 × ₡5.000 con un cupón de ₡1.000 aplicado antes del retiro de cupones. */
    private static Pedido historicoConCupon(Empresa e, int iva) {
        Pedido p = new Pedido();
        p.setEmpresa(e);
        PedidoItem it = new PedidoItem();
        Producto prod = new Producto();
        prod.setId(3L);
        prod.setNombreProducto("Taza");
        prod.setPorcentajeIva(new BigDecimal("13.00"));
        prod.setCodigoTarifaIva("08");
        prod.setCodigoCabys("4321150100101");
        it.setProducto(prod);
        it.setCantidad(2);
        it.setPrecioUnitarioMomento(5000);
        it.setSubtotalItem(10_000);
        it.setPedido(p);
        p.setItems(List.of(it));
        p.setSubtotal(10_000);
        p.setCuponCodigo("VIEJO10");
        p.setDescuentoTotal(1000);
        p.setCostoEnvio(0);
        p.setMontoImpuesto(iva);
        p.setTotalPedido(10_000 - 1000 + iva);
        return p;
    }

    @Test
    @DisplayName("Factura de un pedido histórico con cupón: el XML respeta descuentoTotal y cuadra con lo cobrado")
    void facturaHistoricaConCupon() {
        Pedido simp = historicoConCupon(empresa(97L, null, "SIMPLIFICADO"), 1170);
        assertThat(PosVentaIvaRegimenTest.totalXml(simp, ComprobanteFiscal.TIPO_FACTURA)).isEqualTo(10_170);

        Pedido trad = historicoConCupon(empresa(98L, null, "TRADICIONAL"), 0);
        assertThat(PosVentaIvaRegimenTest.totalXml(trad, ComprobanteFiscal.TIPO_TIQUETE)).isEqualTo(9_000);
    }
}
