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
import com.hotclick.service.email.ReembolsoPendienteResumenItem;
import com.hotclick.service.sinpe.SinpeOnvoMarketplaceService;
import com.hotclick.service.TilopayService;
import com.hotclick.service.payment.PaymentExpirationCleanupService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * M-08 (opción b): dos pagos sobre la última unidad. El segundo cobro se registra, el pedido pasa a
 * revisión (no se despacha), el reembolso queda pendiente, el stock nunca queda negativo y ONVO recibe 200.
 * Los productos personalizados o bajo pedido se venden sin stock y no entran en revisión.
 */
@DisplayName("[M-08] Sobreventa después del cobro: revisión, reembolso pendiente y stock nunca negativo")
class OnvoSobreventaPostCobroTest extends BaseIntegrationTest {

    private static final String SESION_A = "cs_m08_a";
    private static final String SESION_B = "cs_m08_b";
    private static final String INTENT_A = "pi_m08_a";
    private static final String INTENT_B = "pi_m08_b";
    private static final String SECRET = "m08-prueba";

    @MockitoBean private OnvoService onvoService;

    /** Sin uso acá: comparte el contexto Spring con ReintentoSobreReembolsoIntegracionTest (mismos mocks), así
     *  no se crea un contexto más que desaloje otro del caché y su create-drop borre el esquema H2 compartido. */
    @MockitoBean private TilopayService tilopayService;

    @Autowired private PaymentExpirationCleanupService cleanup;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;

    @Autowired private SinpeOnvoMarketplaceService sinpe;

    private Empresa empresa;
    private Bodega bodega;
    private Categoria categoria;

    @BeforeEach
    void armar() {
        reset(notificacionEmailService);
        when(onvoService.getWebhookSecret()).thenReturn(SECRET);
        when(onvoService.isPagosDisponibles()).thenReturn(true);
        when(onvoService.modoEsperado()).thenReturn("live");
        prepararOnvo(SESION_A, INTENT_A);
        prepararOnvo(SESION_B, INTENT_B);

        String slug = "m08-" + System.nanoTime();
        empresa = new Empresa();
        empresa.setNombreEmpresa("M08");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);

        bodega = new Bodega();
        bodega.setNombreBodega("Bodega M08");
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
        categoria.setNombreCategoria("Cat-M08-" + System.nanoTime());
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

    private void prepararOnvo(String sesion, String intent) {
        doReturn(Map.of("paymentStatus", "paid", "status", "complete", "paymentIntentId", intent, "mode", "live"))
            .when(onvoService).obtenerCheckoutSession(sesion);
        doReturn(Map.of("id", intent, "status", "succeeded", "amount", 1_000_000, "currency", "CRC", "mode", "live"))
            .when(onvoService).obtenerPaymentIntent(intent);
    }

    private Producto producto(int stock, int reservado, boolean personalizado) {
        Producto p = new Producto();
        p.setNombreProducto("Producto M08");
        p.setSku("SKU-M08-" + System.nanoTime());
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

    /** Pedido PENDIENTE de 1 unidad con su Pago ONVO PENDIENTE (token = sesión). */
    private Pedido pedidoConPago(String sesion, Producto producto, String numero) {
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
        p.setMetodoPago(Constants.PROVEEDOR_ONVO);
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
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(p);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.saveAndFlush(pago);
        return p;
    }

    private void webhook(String sesion, String status) throws Exception {
        mockMvc.perform(post("/api/webhooks/onvo")
                .header("X-Webhook-Secret", SECRET)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"checkout-session.succeeded\",\"data\":{\"id\":\"" + sesion + "\"}}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value(status));
    }

    private String estadoPedido(Pedido p) { return pedidoRepository.findById(p.getId()).orElseThrow().getEstadoPedido(); }

    private Pago pago(String sesion) { return pagoRepository.findByMerchantToken(sesion).orElseThrow(); }

    @Test
    @DisplayName("Segundo cobro sin stock: 200 refund_pending, pago registrado, pedido en revisión, stock ≥ 0; el reintento es duplicate")
    void segundoCobroSinStockQuedaEnRevision() throws Exception {
        // Última unidad: la compra A la consume; la compra B ya la tenía reservada antes (reserva doble por carrera).
        Producto producto = producto(1, 2, false);
        Pedido a = pedidoConPago(SESION_A, producto, "ORD-M08A");
        Pedido b = pedidoConPago(SESION_B, producto, "ORD-M08B");

        webhook(SESION_A, "ok");
        assertThat(estadoPedido(a)).isEqualTo(Constants.PEDIDO_PAGADO);
        assertThat(pago(SESION_A).getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);

        webhook(SESION_B, "refund_pending");

        assertThat(pago(SESION_B).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(estadoPedido(b)).isEqualTo(Constants.PEDIDO_REVISION_SOBREVENTA);
        Producto tras = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(tras.getStockActual()).isZero();
        assertThat(tras.getStockReservado()).isZero();
        assertThat(webhookEventRepository.existsByMerchantTokenAndEventoTipo(SESION_B,
            "checkout-session.succeeded")).isTrue();
        // El pedido A no se tocó.
        assertThat(estadoPedido(a)).isEqualTo(Constants.PEDIDO_PAGADO);

        // Segundo webhook del mismo cobro: duplicado, sin cambios.
        webhook(SESION_B, "duplicate");
        assertThat(pago(SESION_B).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(estadoPedido(b)).isEqualTo(Constants.PEDIDO_REVISION_SOBREVENTA);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockActual()).isZero();
    }

    @Test
    @DisplayName("El barrido de expiración no cancela ni resucita un pedido en revisión por sobreventa")
    void cleanupNoCancelaPedidoEnRevision() throws Exception {
        Producto producto = producto(1, 2, false);
        pedidoConPago(SESION_A, producto, "ORD-M08A");
        Pedido b = pedidoConPago(SESION_B, producto, "ORD-M08B");
        webhook(SESION_A, "ok");
        webhook(SESION_B, "refund_pending");

        // Pago viejo (> 30 min): el barrido lo evaluaría si siguiera pendiente.
        Pago pagoB = pago(SESION_B);
        pagoB.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR).minusHours(2));
        pagoRepository.saveAndFlush(pagoB);

        cleanup.ejecutar();

        assertThat(pago(SESION_B).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(estadoPedido(b)).isEqualTo(Constants.PEDIDO_REVISION_SOBREVENTA);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockActual()).isZero();
    }

    @Test
    @DisplayName("Producto personalizado o bajo pedido: se vende sin stock, no entra en revisión y el stock no baja de 0")
    void personalizadoNoEntraEnRevision() throws Exception {
        Producto producto = producto(0, 0, true);
        Pedido a = pedidoConPago(SESION_A, producto, "ORD-M08A");
        Pedido b = pedidoConPago(SESION_B, producto, "ORD-M08B");

        webhook(SESION_A, "ok");
        webhook(SESION_B, "ok");

        assertThat(estadoPedido(a)).isEqualTo(Constants.PEDIDO_PAGADO);
        assertThat(estadoPedido(b)).isEqualTo(Constants.PEDIDO_PAGADO);
        assertThat(pago(SESION_A).getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(pago(SESION_B).getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        Producto tras = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(tras.getStockActual()).isZero();
        assertThat(tras.getStockReservado()).isZero();
    }

    @Test
    @DisplayName("Aviso al admin IT: la sobreventa deja la marca de aviso en la misma transacción que el REEMBOLSO_PENDIENTE")
    void sobreventaDejaMarcaDeAviso() throws Exception {
        Producto producto = producto(1, 2, false);
        pedidoConPago(SESION_A, producto, "ORD-M08A");
        pedidoConPago(SESION_B, producto, "ORD-M08B");
        webhook(SESION_A, "ok");
        assertThat(pago(SESION_A).getAvisoReembolsoAdminEn()).isNull();

        webhook(SESION_B, "refund_pending");

        Pago b = pago(SESION_B);
        assertThat(b.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(b.getAvisoReembolsoAdminEn()).isNotNull();
    }

    @Test
    @DisplayName("#479 Sobreventa ONVO: exactamente 1 correo al admin IT (el aviso con pedidos/monto/proveedor), sin alerta extra")
    void sobreventaUnSoloCorreo() throws Exception {
        Producto producto = producto(1, 2, false);
        pedidoConPago(SESION_A, producto, "ORD-M08A");
        Pedido pb = pedidoConPago(SESION_B, producto, "ORD-M08B");
        webhook(SESION_A, "ok");
        webhook(SESION_B, "refund_pending");

        Long id = pago(SESION_B).getId();
        verify(notificacionEmailService, timeout(10_000).times(1)).enviarAvisoReembolsoPendienteAAdminIT(eq(id),
            anyString(), anyString(), eq(ReembolsoPendienteResumenItem.Origen.SOBREVENTA),
            argThat(d -> d != null && d.pedidos().contains(pb.getNumeroPedido()) && d.monto() == 10000));
        verify(notificacionEmailService, after(500).never()).enviarAlertaSobreventaAAdminIT(any(), any(), any(), any());
        verify(notificacionEmailService, times(1)).enviarAvisoReembolsoPendienteAAdminIT(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("#479 Sobreventa SINPE (webhook real → confirmarPedido): exactamente 1 correo al admin IT")
    void sobreventaSinpeUnSoloCorreo() throws Exception {
        Producto producto = producto(1, 2, false);
        pedidoConPago(SESION_A, producto, "ORD-M08A");
        webhook(SESION_A, "ok");
        String intent = "pi_sinpe_" + System.nanoTime();
        String token = SinpeOnvoMarketplaceService.PREFIJO + intent;
        pedidoConPago(token, producto, "ORD-SINPE");
        Pago sp = pago(token);
        sp.setProveedor(Constants.PROVEEDOR_SINPE);
        pagoRepository.saveAndFlush(sp);
        doReturn(Map.of("id", intent, "status", "succeeded", "amount", 1_000_000, "currency", "CRC", "mode", "live"))
            .when(onvoService).obtenerPaymentIntent(intent);

        sinpe.confirmarPorWebhook("payment-intent.succeeded", intent);

        assertThat(pago(token).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        verify(notificacionEmailService, timeout(10_000).times(1)).enviarAvisoReembolsoPendienteAAdminIT(
            eq(sp.getId()), anyString(), anyString(), any(), any());
        verify(notificacionEmailService, after(500).never()).enviarAlertaSobreventaAAdminIT(any(), any(), any(), any());
        verify(notificacionEmailService, times(1)).enviarAvisoReembolsoPendienteAAdminIT(any(), any(), any(), any(), any());
    }
}
