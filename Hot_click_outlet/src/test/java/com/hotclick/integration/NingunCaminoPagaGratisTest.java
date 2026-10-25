package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.OnvoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Criterio de hecho de fix/pasarela-onvo: ningún camino público, del comprador o del webhook deja un
 * pedido PAGADO ni manda el correo de pago confirmado («Total pagado») sin un cobro que ONVO confirme.
 * Efectivo y contra entrega quedan como pago a la entrega, sin ese correo.
 *
 * Caminos del panel que hoy pueden dar PAGADO sin cobro y NO se cubren acá (los cierran otros PRs):
 * pedido manual creado PAGADO con SINPE, ventas de Telegram SINPE/TARJETA y estadoInicial libre en
 * /api/ventas (#221, #225); confirmar-sinpe del cajero en el QR del POS (#220).
 */
@DisplayName("[ONVO] Ningún camino paga gratis")
@TestPropertySource(properties = {
    "hotclick.checkout.sinpe-manual.habilitado=false",
    "payments.onvo.enabled=true"
})
class NingunCaminoPagaGratisTest extends BaseIntegrationTest {

    private static final String SECRET_WEBHOOK = "secreto-de-prueba-onvo";

    @MockitoBean private OnvoService onvoService;
    @MockitoBean private AggregatorService aggregatorService;

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;

    private Empresa empresa;
    private Bodega bodega;
    private Producto producto;
    private String tokenEmp;
    private int secuencia;

    @BeforeEach
    void setUp() {
        when(onvoService.getWebhookSecret()).thenReturn(SECRET_WEBHOOK);
        // Sin llave de ONVO: modo simulado (perfil test), que nunca da un cobro por pagado.
        when(onvoService.isMockMode()).thenReturn(true);
        when(onvoService.isPagosDisponibles()).thenReturn(true);
        when(onvoService.modoEsperado()).thenReturn("live");
        doReturn(Map.of()).when(onvoService).obtenerCheckoutSession(any());
        doReturn(Map.of()).when(onvoService).obtenerPaymentIntent(any());

        String slug = "sin-gratis-" + System.nanoTime();
        empresa = new Empresa();
        empresa.setNombreEmpresa("Sin Gratis");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setVisibilidadPublica(true);
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);

        bodega = new Bodega();
        bodega.setNombreBodega("Bodega Sin Gratis");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("00000000");
        bodega.setProvincia("San José");
        bodega.setCanton("Escazú");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega.setPermiteRetiroCliente(true);
        bodega.setAceptaEfectivo(true);
        bodega = bodegaRepository.saveAndFlush(bodega);
        empresa.setBodegaVentaOnline(bodega);
        empresa = empresaRepository.saveAndFlush(empresa);

        Categoria categoria = new Categoria();
        categoria.setNombreCategoria("Cat-sin-gratis");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);

        producto = new Producto();
        producto.setNombreProducto("Producto Sin Gratis");
        producto.setSku("SKU-SG-" + System.nanoTime());
        producto.setPrecioVenta(10000);
        producto.setPrecioCompra(7000);
        producto.setStockActual(50);
        producto.setStockReservado(0);
        producto.setStockMinimo(1);
        producto.setEstado(Constants.ESTADO_ACTIVO);
        producto.setVisibleCatalogo(true);
        producto.setCategoria(categoria);
        producto.setEmpresa(empresa);
        producto.setBodega(bodega);
        producto.setAdminCliente(adminUser);
        producto.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        producto = productoRepository.saveAndFlush(producto);

        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario emprendedor = crearUsuario("vend-sg-" + System.nanoTime() + "@test.cr", "Vendedor SG", rolEmp);
        emprendedor.setEmpresa(empresa);
        emprendedor = usuarioRepository.saveAndFlush(emprendedor);
        tokenEmp = tokenPara(emprendedor, Constants.ROL_EMPRENDEDOR);
        clearInvocations(notificacionEmailService);
    }

    @AfterEach
    void tearDown() {
        webhookEventRepository.deleteAll();
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        empresaRepository.findAll().forEach(e -> { e.setBodegaVentaOnline(null); empresaRepository.save(e); });
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── Comprador ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Tienda propia en efectivo: queda PENDIENTE y llega «pedido recibido», nunca el de pago confirmado")
    void tiendaPropiaEfectivo() throws Exception {
        String body = """
            {"nombreCliente":"Ana QA","correoCliente":"ana-sg@test.cr","telefonoCliente":"00000000",
             "direccionEntrega":"San José, centro","metodoPago":"EFECTIVO","metodoEnvio":"DOMICILIO",
             "items":[{"productoId":%d,"cantidad":1}]}
            """.formatted(producto.getId());
        mockMvc.perform(post("/api/tienda/" + empresa.getSlug() + "/pedidos")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());

        assertThat(pedidoRepository.findAll()).extracting(Pedido::getEstadoPedido).containsExactly(Constants.PEDIDO_PENDIENTE);
        verify(notificacionEmailService).enviarPedidoRecibido(any());
        sinCorreoDePagoConfirmado();
    }

    @Test
    @DisplayName("Checkout en efectivo: queda PENDIENTE_COMPROBANTE (pago a la entrega), sin correo de pago confirmado")
    void checkoutEfectivo() throws Exception {
        checkoutInvitado("/api/sinpe/guest-checkout", "EFECTIVO").andExpect(status().isOk());

        assertThat(pedidoRepository.findAll()).extracting(Pedido::getEstadoPedido)
            .containsExactly(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        sinPagadoNiCorreo();
    }

    @ParameterizedTest(name = "[{index}] {0} con {1} → 400, sin pedido ni pago")
    @CsvSource({
        "/api/sinpe/guest-checkout,SINPE", "/api/sinpe/guest-checkout,TARJETA", "/api/sinpe/guest-checkout,ONVO",
        "/api/payments/guest-checkout,SINPE", "/api/payments/guest-checkout,STRIPE",
        "/api/payments/guest-checkout,EFECTIVO"})
    @DisplayName("Checkout con un proveedor que no cobra por pasarela → rechazado")
    void proveedorSinCobro(String ruta, String proveedor) throws Exception {
        checkoutInvitado(ruta, proveedor).andExpect(status().isBadRequest());
        assertThat(pedidoRepository.count()).isZero();
        assertThat(pagoRepository.count()).isZero();
        sinCorreoDePagoConfirmado();
    }

    @Test
    @DisplayName("Tarjeta por ONVO sin llave: responde error y no confirma nada")
    void onvoSinLlave() throws Exception {
        checkoutInvitado("/api/payments/guest-checkout", "ONVO").andExpect(status().is4xxClientError());
        sinPagadoNiCorreo();
    }

    @Test
    @DisplayName("Gift card que no existe: no paga el pedido")
    void giftCardInexistente() throws Exception {
        String body = """
            {"bodegaId":%d,"metodoEnvio":"%s","provider":"ONVO","codigoGiftCard":"NO-EXISTE-123",
             "items":[{"productoId":%d,"cantidad":1}]}
            """.formatted(bodega.getId(), Constants.ENVIO_RETIRO, producto.getId());
        mockMvc.perform(post("/api/payments/checkout").header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().is4xxClientError());
        sinPagadoNiCorreo();
    }

    // ── Panel del vendedor ────────────────────────────────────────────────────

    @ParameterizedTest(name = "[{index}] método {0} → 400, sigue PENDIENTE")
    @ValueSource(strings = {"SINPE", "SINPE_MOVIL", "TARJETA", "ONVO", "TRANSFERENCIA"})
    @DisplayName("El vendedor no puede marcar PAGADO con una referencia libre si el método no se cobra en mano")
    void vendedorNoMarcaPagadoSinCobro(String metodo) throws Exception {
        Pedido p = crearPedido(metodo);
        crearPago(p, Constants.PROVEEDOR_SINPE, "tok-" + metodo + "-" + System.nanoTime());
        mockMvc.perform(put("/api/pedidos/" + p.getId() + "/estado").header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"PAGADO\",\"referencia\":\"inventada-123\"}"))
            .andExpect(status().isBadRequest());
        sinPagadoNiCorreo();
    }

    @Test
    @DisplayName("Tampoco puede marcar PAGADO un pedido que se cobra con ONVO")
    void vendedorNoMarcaPagadoUnPedidoOnvo() throws Exception {
        Pedido p = crearPedido("ONVO");
        crearPago(p, Constants.PROVEEDOR_ONVO, "cs_panel_" + System.nanoTime());
        mockMvc.perform(put("/api/pedidos/" + p.getId() + "/estado").header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"PAGADO\",\"referencia\":\"inventada-123\"}"))
            .andExpect(status().isBadRequest());
        sinPagadoNiCorreo();
    }

    // ── Webhook ONVO ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("Webhook con secret válido pero ONVO dice unpaid → sigue PENDIENTE")
    void webhookSinCobro() throws Exception {
        Pedido p = pedidoOnvo("cs_unpaid");
        onvoResponde("cs_unpaid", "unpaid", "requires_payment_method", 1_000_000L);
        webhook("cs_unpaid").andExpect(status().isConflict());
        assertEstado(p, Constants.PEDIDO_PENDIENTE);
        sinCorreoDePagoConfirmado();
    }

    @Test
    @DisplayName("Webhook con monto en colones en vez de céntimos → sigue PENDIENTE")
    void webhookMontoDistinto() throws Exception {
        Pedido p = pedidoOnvo("cs_monto");
        onvoResponde("cs_monto", "paid", "succeeded", 10_000L);
        webhook("cs_monto").andExpect(status().isConflict());
        assertEstado(p, Constants.PEDIDO_PENDIENTE);
        sinCorreoDePagoConfirmado();
    }

    @Test
    @DisplayName("Webhook de una sesión que ONVO no tiene (o sin llave) → sigue PENDIENTE")
    void webhookSesionDesconocida() throws Exception {
        Pedido p = pedidoOnvo("cs_falsa");
        webhook("cs_falsa").andExpect(status().isNotFound());
        assertEstado(p, Constants.PEDIDO_PENDIENTE);
        sinCorreoDePagoConfirmado();
    }

    @Test
    @DisplayName("Webhook con secret inválido → 401, sigue PENDIENTE")
    void webhookSecretInvalido() throws Exception {
        Pedido p = pedidoOnvo("cs_sin_secret");
        onvoResponde("cs_sin_secret", "paid", "succeeded", 1_000_000L);
        mockMvc.perform(post("/api/webhooks/onvo").header("X-Webhook-Secret", "otro")
                .contentType(MediaType.APPLICATION_JSON).content(eventoSesion("cs_sin_secret")))
            .andExpect(status().isUnauthorized());
        assertEstado(p, Constants.PEDIDO_PENDIENTE);
        sinCorreoDePagoConfirmado();
    }

    @Test
    @DisplayName("Cobro de ONVO que llega tarde sobre un pedido ya CANCELADO → no se resucita; queda para reembolso")
    void webhookTardioSobrePedidoCancelado() throws Exception {
        Pedido p = pedidoOnvo("cs_tarde");
        p.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pedidoRepository.saveAndFlush(p);
        Pago pago = pagoRepository.findByMerchantToken("cs_tarde").orElseThrow();
        pago.setEstadoPago(Constants.PAGO_CANCELADO);
        pagoRepository.saveAndFlush(pago);
        onvoResponde("cs_tarde", "paid", "succeeded", 1_000_000L);

        webhook("cs_tarde").andExpect(status().isOk());
        webhook("cs_tarde").andExpect(status().isOk());

        assertEstado(p, Constants.PEDIDO_CANCELADO);
        assertThat(pagoRepository.findByMerchantToken("cs_tarde").orElseThrow().getEstadoPago())
            .isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        sinCorreoDePagoConfirmado();
    }

    @Test
    @DisplayName("Control: ONVO confirma el cobro exacto → PAGADO con un solo correo, aunque el webhook se repita")
    void webhookCobroConfirmado() throws Exception {
        Pedido p = pedidoOnvo("cs_ok");
        onvoResponde("cs_ok", "paid", "succeeded", 1_000_000L);

        webhook("cs_ok").andExpect(status().isOk());
        webhook("cs_ok").andExpect(status().isOk());

        assertEstado(p, Constants.PEDIDO_PAGADO);
        assertThat(pagoRepository.findByMerchantToken("cs_ok").orElseThrow().getEstadoPago())
            .isEqualTo(Constants.PAGO_CAPTURADO);
        verify(notificacionEmailService, times(1)).enviarConfirmacionPedido(any());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void sinCorreoDePagoConfirmado() {
        verify(notificacionEmailService, never()).enviarConfirmacionPedido(any());
    }

    private void sinPagadoNiCorreo() {
        assertThat(pedidoRepository.findAll()).extracting(Pedido::getEstadoPedido)
            .doesNotContain(Constants.PEDIDO_PAGADO);
        assertThat(pagoRepository.findAll()).extracting(Pago::getEstadoPago)
            .doesNotContain(Constants.PAGO_CAPTURADO);
        sinCorreoDePagoConfirmado();
    }

    private void assertEstado(Pedido p, String esperado) {
        assertThat(pedidoRepository.findById(p.getId()).orElseThrow().getEstadoPedido()).isEqualTo(esperado);
    }

    private ResultActions checkoutInvitado(String ruta, String proveedor) throws Exception {
        String body = """
            {"bodegaId":%d,"metodoEnvio":"%s","provider":"%s","guestEmail":"sg-%d@test.cr",
             "guestPhone":"0000%04d","items":[{"productoId":%d,"cantidad":1}]}
            """.formatted(bodega.getId(), Constants.ENVIO_RETIRO, proveedor, ++secuencia, secuencia, producto.getId());
        return mockMvc.perform(post(ruta).contentType(MediaType.APPLICATION_JSON)
            .header("X-Forwarded-For", "203.0.113." + (100 + secuencia)).content(body));
    }

    private ResultActions webhook(String sessionId) throws Exception {
        return mockMvc.perform(post("/api/webhooks/onvo").header("X-Webhook-Secret", SECRET_WEBHOOK)
            .contentType(MediaType.APPLICATION_JSON).content(eventoSesion(sessionId)));
    }

    /** El cuerpo dice «pagado» siempre: lo que decide es lo que ONVO responde por GET. */
    private static String eventoSesion(String sessionId) {
        return "{\"type\":\"checkout-session.succeeded\",\"data\":{\"id\":\"" + sessionId
            + "\",\"paymentStatus\":\"paid\",\"amountTotal\":1000000,\"currency\":\"CRC\"}}";
    }

    private void onvoResponde(String sessionId, String paymentStatus, String intentStatus, long centimos) {
        doReturn(Map.of("id", sessionId, "paymentStatus", paymentStatus, "status", "complete",
                "paymentIntentId", "pi_" + sessionId, "mode", "live"))
            .when(onvoService).obtenerCheckoutSession(sessionId);
        doReturn(Map.of("id", "pi_" + sessionId, "status", intentStatus, "amount", centimos, "currency", "CRC", "mode", "live"))
            .when(onvoService).obtenerPaymentIntent("pi_" + sessionId);
    }

    private Pedido pedidoOnvo(String sessionId) {
        Pedido p = crearPedido(Constants.PROVEEDOR_ONVO);
        crearPago(p, Constants.PROVEEDOR_ONVO, sessionId);
        return p;
    }

    private Pedido crearPedido(String metodoPago) {
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-SG-" + (++secuencia));
        p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(10000);
        p.setTotalPedido(10000);
        p.setCostoTotalProductos(7000);
        p.setUtilidadBruta(3000);
        p.setMetodoPago(metodoPago);
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        return pedidoRepository.saveAndFlush(p);
    }

    private void crearPago(Pedido p, String proveedor, String token) {
        Pago pago = new Pago();
        pago.setMerchantToken(token);
        pago.setMonto(p.getTotalPedido());
        pago.setMoneda("CRC");
        pago.setProveedor(proveedor);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(p);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.saveAndFlush(pago);
    }
}
