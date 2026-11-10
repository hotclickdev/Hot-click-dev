package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.payment.PaymentExpirationCleanupService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * MEDIO limpieza (QA: charge succeeded y el pedido quedó cancelado). Caso real del QA: la sesión de ONVO quedó
 * expired/unpaid aunque el intent cobró. Webhook payment-intent.succeeded y barrido de expiración convergen en la
 * misma captura idempotente: una sola confirmación, un solo descuento de stock y una sola acreditación (comisión).
 * Mismo set de mocks que OnvoSobreventaPostCobroTest para reutilizar el contexto Spring.
 */
@DisplayName("[MEDIO] Limpieza + webhook payment-intent.succeeded: cobro capturado nunca se cancela ni se duplica")
class OnvoLimpiezaCapturadoWebhookTest extends BaseIntegrationTest {

    private static final String SESION = "cs_limpcapt_sesion01";
    private static final String INTENT = "pi_limpcapt_intent01";
    private static final String SECRET = "limpieza-capturado-prueba";

    @MockitoBean private OnvoService onvoService;

    @Autowired private PaymentExpirationCleanupService cleanup;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private WalletTransaccionRepository walletTransaccionRepository;

    private Empresa empresa;
    private Bodega bodega;
    private Categoria categoria;

    @BeforeEach
    void armar() {
        when(onvoService.getWebhookSecret()).thenReturn(SECRET);
        when(onvoService.isPagosDisponibles()).thenReturn(true);
        when(onvoService.modoEsperado()).thenReturn("test");

        String slug = "limpcapt-" + System.nanoTime();
        empresa = new Empresa();
        empresa.setNombreEmpresa("LimpCapt");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);

        bodega = new Bodega();
        bodega.setNombreBodega("Bodega LimpCapt");
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
        categoria.setNombreCategoria("Cat-LimpCapt-" + System.nanoTime());
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);
    }

    @AfterEach
    void limpiar() {
        walletTransaccionRepository.deleteAll();
        webhookEventRepository.deleteAll();
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    /** Sesión expired/unpaid (como la vio QA) y el intent cobrado, con metadata.pedidoId del checkout. */
    private void onvoCobradoConSesionVencida(Long pedidoId, String estadoIntent) {
        doReturn(Map.of("id", SESION, "paymentStatus", "unpaid", "status", "expired", "paymentIntentId", INTENT, "mode", "test"))
            .when(onvoService).obtenerCheckoutSession(SESION);
        Map<String, Object> intent = new HashMap<>(Map.of("id", INTENT, "status", estadoIntent, "amount", 1_000_000,
            "currency", "CRC", "mode", "test", "metadata", Map.of("pedidoId", String.valueOf(pedidoId))));
        if ("succeeded".equals(estadoIntent)) intent.put("receivedAmount", 1_000_000);
        doReturn(intent).when(onvoService).obtenerPaymentIntent(INTENT);
    }

    private Producto producto(int stock, int reservado) {
        Producto p = new Producto();
        p.setNombreProducto("Producto LimpCapt");
        p.setSku("SKU-LC-" + System.nanoTime());
        p.setPrecioVenta(10000);
        p.setPrecioCompra(7000);
        p.setStockActual(stock);
        p.setStockReservado(reservado);
        p.setStockMinimo(0);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setEsPersonalizado(false);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(bodega);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }

    /** Pedido PENDIENTE de 1 unidad con su pago ONVO PENDIENTE creado hace 2 h (vencido para el barrido). */
    private Pedido pedidoConPagoVencido(Producto producto) {
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-LC-" + (System.nanoTime() % 1_000_000));
        p.setStockReservadoEn(LocalDateTime.now());
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
        pago.setMerchantToken(SESION);
        pago.setMonto(10000);
        pago.setMoneda("CRC");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(p);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR).minusHours(2));
        pagoRepository.saveAndFlush(pago);
        return p;
    }

    private MvcResult webhookIntent() throws Exception {
        return mockMvc.perform(post("/api/webhooks/onvo")
                .header("X-Webhook-Secret", SECRET)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"payment-intent.succeeded\",\"data\":{\"id\":\"" + INTENT + "\"}}"))
            .andReturn();
    }

    private String estadoPedido(Pedido p) { return pedidoRepository.findById(p.getId()).orElseThrow().getEstadoPedido(); }

    private Pago pago() { return pagoRepository.findByMerchantToken(SESION).orElseThrow(); }

    private long creditosVenta(Pedido p) {
        return walletTransaccionRepository.findAll().stream()
            .filter(t -> WalletTransaccion.REF_PEDIDO.equals(t.getReferenciaTipo())
                && p.getId().equals(t.getReferenciaId()) && WalletTransaccion.CREDITO_VENTA.equals(t.getTipo()))
            .count();
    }

    @Test
    @DisplayName("Barrido: intent succeeded con sesión expired/unpaid → pedido PAGADO, stock descontado una vez, no CANCELADO")
    void barridoConfirmaCobroCapturado() {
        Producto producto = producto(1, 1);
        Pedido pedido = pedidoConPagoVencido(producto);
        onvoCobradoConSesionVencida(pedido.getId(), "succeeded");

        cleanup.ejecutar();
        cleanup.ejecutar(); // segunda vuelta: sin cambios

        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_PAGADO);
        Producto tras = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(tras.getStockActual()).isZero();
        assertThat(tras.getStockReservado()).isZero();
        assertThat(webhookEventRepository.findAll()).hasSize(1);
        assertThat(creditosVenta(pedido)).isLessThanOrEqualTo(1);
        verify(onvoService, never()).expirarCheckoutSessionTipado(any());
    }

    @Test
    @DisplayName("Barrido: cobrado sin stock → REEMBOLSO_PENDIENTE y pedido en revisión, nunca CANCELADO")
    void barridoSinStockReembolsoPendiente() {
        Producto producto = producto(0, 0);
        Pedido pedido = pedidoConPagoVencido(producto);
        onvoCobradoConSesionVencida(pedido.getId(), "succeeded");

        cleanup.ejecutar();

        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_REVISION_SOBREVENTA);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockActual()).isZero();
    }

    @Test
    @DisplayName("Barrido: intent no cobrado (requires_payment_method) → se cancela y libera la reserva como hoy")
    void barridoNoCobradoCancela() {
        Producto producto = producto(1, 1);
        Pedido pedido = pedidoConPagoVencido(producto);
        onvoCobradoConSesionVencida(pedido.getId(), "requires_payment_method");

        cleanup.ejecutar();

        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_CANCELADO);
        Producto tras = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(tras.getStockActual()).isEqualTo(1);
        assertThat(tras.getStockReservado()).isZero();
    }

    @Test
    @DisplayName("Barrido: ONVO caído al releer el intent → sin cambios")
    void barridoOnvoCaidoSinCambios() {
        Producto producto = producto(1, 1);
        Pedido pedido = pedidoConPagoVencido(producto);
        onvoCobradoConSesionVencida(pedido.getId(), "requires_payment_method");
        doReturn(Map.of("id", INTENT, "status", "requires_payment_method", "amount", 1_000_000, "currency", "CRC", "mode", "test"))
            .doThrow(new IllegalStateException("Servicio de pagos no disponible temporalmente"))
            .when(onvoService).obtenerPaymentIntent(INTENT);

        cleanup.ejecutar();

        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockReservado()).isEqualTo(1);
    }

    @Test
    @DisplayName("Webhook payment-intent.succeeded duplicado → 200 ok y luego duplicate; una confirmación, un descuento, una acreditación")
    void webhookDuplicadoUnaSolaConfirmacion() throws Exception {
        Producto producto = producto(1, 1);
        Pedido pedido = pedidoConPagoVencido(producto);
        onvoCobradoConSesionVencida(pedido.getId(), "succeeded");

        MvcResult r1 = webhookIntent();
        MvcResult r2 = webhookIntent();

        assertThat(r1.getResponse().getStatus()).isEqualTo(200);
        assertThat(r2.getResponse().getStatus()).isEqualTo(200);
        assertThat(r2.getResponse().getContentAsString()).contains("duplicate");
        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_PAGADO);
        Producto tras = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(tras.getStockActual()).isZero();
        assertThat(tras.getStockReservado()).isZero();
        assertThat(webhookEventRepository.findAll()).hasSize(1);
        assertThat(creditosVenta(pedido)).isLessThanOrEqualTo(1);
    }

    @Test
    @DisplayName("Webhook payment-intent.succeeded sin pedido en metadata → 200 como hoy, sin tocar pagos")
    void webhookSinMetadataComoHoy() throws Exception {
        Producto producto = producto(1, 1);
        Pedido pedido = pedidoConPagoVencido(producto);
        doReturn(Map.of("id", INTENT, "status", "succeeded", "amount", 1_000_000, "currency", "CRC", "mode", "test"))
            .when(onvoService).obtenerPaymentIntent(INTENT);

        MvcResult r = webhookIntent();

        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_PENDIENTE);
    }

    @Test
    @DisplayName("Webhook con ONVO caído al leer el intent → 503 para que ONVO reintente, sin cambios")
    void webhookOnvoCaido503() throws Exception {
        Producto producto = producto(1, 1);
        Pedido pedido = pedidoConPagoVencido(producto);
        org.mockito.Mockito.doThrow(new IllegalStateException("caído")).when(onvoService).obtenerPaymentIntent(INTENT);

        MvcResult r = webhookIntent();

        assertThat(r.getResponse().getStatus()).isEqualTo(503);
        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_PENDIENTE);
    }

    @Test
    @DisplayName("Carrera webhook vs barrido → una sola confirmación y stock descontado una vez; nunca CANCELADO")
    void carreraWebhookVsBarrido() throws Exception {
        Producto producto = producto(1, 1);
        Pedido pedido = pedidoConPagoVencido(producto);
        onvoCobradoConSesionVencida(pedido.getId(), "succeeded");

        CyclicBarrier largada = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Integer> web = pool.submit(() -> {
                largada.await(5, TimeUnit.SECONDS);
                return webhookIntent().getResponse().getStatus();
            });
            Future<?> barrido = pool.submit(() -> {
                largada.await(5, TimeUnit.SECONDS);
                cleanup.ejecutar();
                return null;
            });
            assertThat(web.get(60, TimeUnit.SECONDS)).isEqualTo(200);
            barrido.get(60, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }

        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_PAGADO);
        Producto tras = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(tras.getStockActual()).isZero();
        assertThat(tras.getStockReservado()).isZero();
        assertThat(webhookEventRepository.findAll()).hasSize(1);
        assertThat(creditosVenta(pedido)).isLessThanOrEqualTo(1);
    }

    @Test
    @DisplayName("Barrido canceló antes (intent sin cobro) y después llega el cobro por webhook → REEMBOLSO_PENDIENTE, no silencioso")
    void cobroTardioSobreCanceladoQuedaParaReembolso() throws Exception {
        Producto producto = producto(1, 1);
        Pedido pedido = pedidoConPagoVencido(producto);
        onvoCobradoConSesionVencida(pedido.getId(), "requires_payment_method");
        cleanup.ejecutar();
        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);

        onvoCobradoConSesionVencida(pedido.getId(), "succeeded");
        MvcResult r = webhookIntent();

        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        assertThat(r.getResponse().getContentAsString()).contains("refund_pending");
        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_CANCELADO);
    }

    // ── Corrección 404: sesión inexistente no prueba que el intent no cobró ─────────────────────────────────────

    @Test
    @DisplayName("404 sin intent resoluble: el barrido (TTL y anti-bot) no cancela ni libera stock")
    void sesion404SinIntentNoLiberaStock() {
        Producto producto = producto(1, 1);
        Pedido pedido = pedidoConPagoVencido(producto);
        doReturn(Map.of()).when(onvoService).obtenerCheckoutSession(SESION);

        cleanup.ejecutar();
        cleanup.ejecutar();

        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockReservado()).isEqualTo(1);
    }

    @Test
    @DisplayName("El intent visto en una vuelta se guarda (V237); si después la sesión da 404 y el intent cobró → PAGADO")
    void intentGuardadoLuegoSesion404Cobrado() {
        Producto producto = producto(1, 1);
        Pedido pedido = pedidoConPagoVencido(producto);
        onvoCobradoConSesionVencida(pedido.getId(), "processing"); // en duda: no se toca, pero se recuerda el intent
        cleanup.ejecutar();
        assertThat(pago().getOnvoPaymentIntentId()).isEqualTo(INTENT);
        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);

        doReturn(Map.of()).when(onvoService).obtenerCheckoutSession(SESION);
        doReturn(Map.of("id", INTENT, "status", "succeeded", "amount", 1_000_000, "receivedAmount", 1_000_000,
            "currency", "CRC", "mode", "test")).when(onvoService).obtenerPaymentIntent(INTENT);
        cleanup.ejecutar();

        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_PAGADO);
        Producto tras = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(tras.getStockActual()).isZero();
        assertThat(tras.getStockReservado()).isZero();
    }

    @Test
    @DisplayName("404 + intent guardado no cobrado → se cancela y libera como hoy")
    void sesion404IntentGuardadoNoCobradoCancela() {
        Producto producto = producto(1, 1);
        Pedido pedido = pedidoConPagoVencido(producto);
        Pago pg = pago();
        pg.setOnvoPaymentIntentId(INTENT);
        pagoRepository.saveAndFlush(pg);
        doReturn(Map.of()).when(onvoService).obtenerCheckoutSession(SESION);
        doReturn(Map.of("id", INTENT, "status", "requires_payment_method", "amount", 1_000_000,
            "currency", "CRC", "mode", "test")).when(onvoService).obtenerPaymentIntent(INTENT);

        cleanup.ejecutar();

        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockReservado()).isZero();
    }

    @Test
    @DisplayName("Webhook tardío con sesión 404: encuentra el pago por el intent guardado y deja REEMBOLSO_PENDIENTE sobre el cancelado")
    void webhookTardioSesion404PorIntentGuardado() throws Exception {
        Producto producto = producto(1, 1);
        Pedido pedido = pedidoConPagoVencido(producto);
        onvoCobradoConSesionVencida(pedido.getId(), "requires_payment_method");
        cleanup.ejecutar(); // se recuerda el intent y se cancela (sin cobro)
        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
        assertThat(pago().getOnvoPaymentIntentId()).isEqualTo(INTENT);

        // El cobro entra después; ONVO ya no tiene la sesión y el intent no trae metadata.
        doReturn(Map.of()).when(onvoService).obtenerCheckoutSession(SESION);
        doReturn(Map.of("id", INTENT, "status", "succeeded", "amount", 1_000_000, "receivedAmount", 1_000_000,
            "currency", "CRC", "mode", "test")).when(onvoService).obtenerPaymentIntent(INTENT);
        MvcResult r = webhookIntent();

        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        assertThat(r.getResponse().getContentAsString()).contains("refund_pending");
        assertThat(pago().getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(estadoPedido(pedido)).isEqualTo(Constants.PEDIDO_CANCELADO);
    }
}
