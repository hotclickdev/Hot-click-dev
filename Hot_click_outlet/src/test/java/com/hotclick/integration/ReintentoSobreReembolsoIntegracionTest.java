package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.payment.OnvoCapturaService;
import com.hotclick.payment.StripePaymentProvider;
import com.hotclick.service.TilopayService;
import com.hotclick.service.payment.TilopayConfirmacionService;
import com.stripe.model.checkout.Session;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * MEDIO 1 de la pre-revisión del PR #460: un reintento del proveedor (ONVO, Tilopay o Stripe) sobre un pago
 * que ya está en REEMBOLSO_PENDIENTE no puede capturarlo ni confirmar el pedido, aunque alguna consulta
 * intermedia vacíe la sesión (flush AUTO) antes de llegar a confirmarPedido. Flujos reales con Spring + H2.
 */
@DisplayName("[PR460-M1] Reintento sobre REEMBOLSO_PENDIENTE bloqueado en ONVO, Tilopay y Stripe (integración)")
class ReintentoSobreReembolsoIntegracionTest extends BaseIntegrationTest {

    @MockitoBean private OnvoService onvoService;

    @MockitoBean private TilopayService tilopayService;

    @Autowired private OnvoCapturaService onvoCapturaService;
    @Autowired private TilopayConfirmacionService tilopayConfirmacionService;
    @Autowired private StripePaymentProvider stripePaymentProvider;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;

    private Empresa empresa;
    private Bodega bodega;
    private Categoria categoria;

    @BeforeEach
    void armar() {
        when(onvoService.isPagosDisponibles()).thenReturn(true);
        when(onvoService.modoEsperado()).thenReturn("test");

        String slug = "rp-" + System.nanoTime();
        empresa = new Empresa();
        empresa.setNombreEmpresa("RP");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);

        bodega = new Bodega();
        bodega.setNombreBodega("Bodega RP");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("00000000");
        bodega.setProvincia("San José");
        bodega.setCanton("Escazú");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);

        categoria = new Categoria();
        categoria.setNombreCategoria("Cat-RP-" + System.nanoTime());
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);
    }

    @AfterEach
    void limpiar() {
        webhookEventRepository.deleteAll();
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    private Producto producto(int stock, int reservado, boolean personalizado) {
        Producto p = new Producto();
        p.setNombreProducto("Producto RP");
        p.setSku("SKU-RP-" + System.nanoTime());
        p.setPrecioVenta(10000);
        p.setPrecioCompra(7000);
        p.setStockActual(stock);
        p.setStockReservado(reservado);
        p.setStockMinimo(0);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setEsPersonalizado(personalizado);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(bodega);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }

    /** Pedido PENDIENTE de 1 unidad con su Pago en REEMBOLSO_PENDIENTE (token = sesión/orden). */
    private Pedido pedidoConPago(String sesion, Producto producto, String numero, String proveedor) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero + "-" + (System.nanoTime() % 1_000_000));
        p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(10000);
        p.setTotalPedido(10000);
        p.setCostoTotalProductos(7000);
        p.setUtilidadBruta(3000);
        p.setMetodoPago(proveedor);
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        PedidoItem item = new PedidoItem();
        item.setCantidad(1);
        item.setPrecioUnitarioMomento(10000);
        item.setCostoUnitarioMomento(7000);
        item.setSubtotalItem(10000);
        item.setUtilidadItem(3000);
        item.setProducto(producto);
        item.setPedido(p);
        p.setItems(new ArrayList<>(List.of(item)));
        p = pedidoRepository.saveAndFlush(p);

        Pago pago = new Pago();
        pago.setMerchantToken(sesion);
        pago.setMonto(10000);
        pago.setMoneda("CRC");
        pago.setProveedor(proveedor);
        // Reintento: el cobro ya quedó para reembolso en la base (sobreventa o grupo cancelado).
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pago.setPedido(p);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.saveAndFlush(pago);
        return p;
    }

    private void assertSinReintento(Pedido pedido, String token, Producto producto) {
        // Lectura fresca de la base (fuera de la transacción del proveedor): lo que quedó escrito.
        assertThat(pagoRepository.findByMerchantToken(token).orElseThrow().getEstadoPago())
            .isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pedidoRepository.findById(pedido.getId()).orElseThrow().getEstadoPedido())
            .isEqualTo(Constants.PEDIDO_PENDIENTE);
        Producto tras = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(tras.getStockActual()).isEqualTo(5);
        assertThat(tras.getStockReservado()).isEqualTo(1);
    }

    @Test
    @DisplayName("ONVO: reintento sobre REEMBOLSO_PENDIENTE (modo prueba, con consulta que vacía la sesión) no captura ni confirma")
    void onvoReintentoNoCaptura() {
        Producto producto = producto(5, 1, false);
        Pedido pedido = pedidoConPago("cs_rp_onvo", producto, "ORD-RPO", Constants.PROVEEDOR_ONVO);

        OnvoCapturaService.Captura r = onvoCapturaService.capturarVerificado("cs_rp_onvo", "{}", "test");

        assertThat(r).isNotEqualTo(OnvoCapturaService.Captura.CAPTURADO);
        assertSinReintento(pedido, "cs_rp_onvo", producto);
    }

    @Test
    @DisplayName("Tilopay: webhook aprobado sobre REEMBOLSO_PENDIENTE no captura ni confirma")
    void tilopayReintentoNoCaptura() {
        Producto producto = producto(5, 1, false);
        Pedido pedido = pedidoConPago("ORD-RPT-1", producto, "ORD-RPT", Constants.PROVEEDOR_TILOPAY);
        when(tilopayService.consultarTransaccion("ORD-RPT-1")).thenReturn(new TilopayService.ConsultaResultado(
            true, "1", "Aprobada", "auth", BigDecimal.valueOf(10000), "CRC", "ORD-RPT-1", false));

        tilopayConfirmacionService.procesarWebhook("ORD-RPT-1", "{}");

        assertSinReintento(pedido, "ORD-RPT-1", producto);
    }

    @Test
    @DisplayName("Stripe: checkout.session.completed sobre REEMBOLSO_PENDIENTE no captura ni confirma")
    void stripeReintentoNoCaptura() {
        Producto producto = producto(5, 1, false);
        Pedido pedido = pedidoConPago("cs_rp_stripe", producto, "ORD-RPS", Constants.PROVEEDOR_STRIPE);
        Session session = mock(Session.class);
        when(session.getId()).thenReturn("cs_rp_stripe");
        when(session.getMetadata()).thenReturn(Map.of("numeroPedido", pedido.getNumeroPedido()));

        stripePaymentProvider.procesarCheckoutCompletado(session, "{}", "127.0.0.1");

        assertSinReintento(pedido, "cs_rp_stripe", producto);
    }
}
