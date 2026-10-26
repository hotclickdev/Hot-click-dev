package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.ModeracionAdminAvisoService;
import com.hotclick.service.OnvoService;
import com.hotclick.service.pos.PosQrVentaCompletionService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Cobertura QA (2026-10-22) de caminos admin que NingunCaminoPagaGratisTest deja fuera:
 * aviso Telegram al pasar a PAGADO, POST /api/ventas (estadoInicial, método, stock) y
 * PUT /api/pos/qr/{token}/confirmar-sinpe (HTTP). ONVO siempre simulado, sin llave.
 * Los tests @Disabled("BUG ...") documentan fallos reales: NO se corrigió código de producción.
 */
@DisplayName("[QA] Cobertura pagos admin: Telegram, /api/ventas, confirmar-sinpe POS")
@TestPropertySource(properties = {
    "hotclick.checkout.sinpe-manual.habilitado=false",
    "payments.onvo.enabled=true"
})
class CoberturaPagosAdminTest extends BaseIntegrationTest {

    private static final String SECRET_WEBHOOK = "secreto-de-prueba-onvo";

    @MockitoBean private OnvoService onvoService;
    @MockitoBean private AggregatorService aggregatorService;
    @MockitoBean private ModeracionAdminAvisoService moderacionAdminAvisoService;
    @MockitoBean private PosQrVentaCompletionService posQrVentaCompletionService;

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private PosQrSesionRepository posQrSesionRepository;

    private Empresa empresa;
    private Bodega bodega;
    private Producto producto;
    private String tokenEmp;
    private Usuario emprendedor;
    private int secuencia;

    @BeforeEach
    void setUp() {
        when(onvoService.getWebhookSecret()).thenReturn(SECRET_WEBHOOK);
        // Sin llave de ONVO: modo simulado (perfil test), que nunca da un cobro por pagado.
        when(onvoService.isMockMode()).thenReturn(true);
        when(onvoService.isPagosDisponibles()).thenReturn(true);
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
        emprendedor = crearUsuario("vend-sg-" + System.nanoTime() + "@test.cr", "Vendedor SG", rolEmp);
        emprendedor.setEmpresa(empresa);
        emprendedor = usuarioRepository.saveAndFlush(emprendedor);
        tokenEmp = tokenPara(emprendedor, Constants.ROL_EMPRENDEDOR);
        clearInvocations(notificacionEmailService, moderacionAdminAvisoService, posQrVentaCompletionService);
    }

    @AfterEach
    void tearDown() {
        posQrSesionRepository.deleteAll();
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

    // ── Telegram: aviso de venta al pasar a PAGADO ────────────────────────────

    @Test
    @DisplayName("Telegram: ONVO confirma el cobro → aviso de venta una sola vez aunque el webhook se repita")
    void telegramAvisoUnaVez() throws Exception {
        Pedido p = pedidoOnvo("cs_tg_ok");
        onvoResponde("cs_tg_ok", "paid", "succeeded", 1_000_000L);
        webhook("cs_tg_ok").andExpect(status().isOk());
        webhook("cs_tg_ok").andExpect(status().isOk());
        assertEstado(p, Constants.PEDIDO_PAGADO);
        verify(moderacionAdminAvisoService, times(1)).avisarNuevaVenta(any());
    }

    @Test
    @DisplayName("Telegram: webhook sin cobro confirmado → ningún aviso de venta")
    void telegramSinCobroSinAviso() throws Exception {
        Pedido p = pedidoOnvo("cs_tg_unpaid");
        onvoResponde("cs_tg_unpaid", "unpaid", "requires_payment_method", 1_000_000L);
        webhook("cs_tg_unpaid").andExpect(status().isConflict());
        assertEstado(p, Constants.PEDIDO_PENDIENTE);
        verify(moderacionAdminAvisoService, never()).avisarNuevaVenta(any());
    }

    // ── POST /api/ventas ──────────────────────────────────────────────────────

    @Test
    @DisplayName("/api/ventas: sin estadoInicial ni método → COMPLETADO, EFECTIVO y descuenta stock")
    void ventaPorDefecto() throws Exception {
        venta("{\"items\":[{\"productoId\":" + producto.getId() + ",\"cantidad\":2}]}")
            .andExpect(status().isOk());
        Pedido p = unicoPedido();
        assertThat(p.getEstadoPedido()).isEqualTo(Constants.PEDIDO_COMPLETADO);
        assertThat(p.getMetodoPago()).isEqualTo("EFECTIVO");
        assertThat(stock()).isEqualTo(48);
    }

    @Test
    @DisplayName("/api/ventas: stock insuficiente → 400, no crea pedido ni toca stock")
    void ventaStockInsuficiente() throws Exception {
        venta("{\"metodoPago\":\"EFECTIVO\",\"items\":[{\"productoId\":" + producto.getId() + ",\"cantidad\":999}]}")
            .andExpect(status().isBadRequest());
        assertThat(pedidoRepository.findAll()).isEmpty();
        assertThat(stock()).isEqualTo(50);
    }

    @Test
    @DisplayName("/api/ventas: cantidad 0 → 400 sin descontar stock")
    void ventaCantidadCero() throws Exception {
        venta("{\"items\":[{\"productoId\":" + producto.getId() + ",\"cantidad\":0}]}")
            .andExpect(status().isBadRequest());
        assertThat(stock()).isEqualTo(50);
    }

    @Test
    @Disabled("BUG #221 (QA 2026-10-22, reproducido): POST /api/ventas con estadoInicial=PAGADO y metodoPago=TARJETA crea el pedido PAGADO sin cobro de pasarela (VentaService.crearVenta usa estadoInicial libre). No se corrige producción en esta rama.")
    @DisplayName("ESPERADO: estadoInicial PAGADO con TARJETA (sin cobro de pasarela) no deja el pedido PAGADO")
    void ventaPagadoConTarjetaSinCobro() throws Exception {
        venta("{\"metodoPago\":\"TARJETA\",\"estadoInicial\":\"PAGADO\",\"items\":[{\"productoId\":"
                + producto.getId() + ",\"cantidad\":1}]}");
        assertThat(pedidoRepository.findAll()).extracting(Pedido::getEstadoPedido)
            .doesNotContain(Constants.PEDIDO_PAGADO);
    }

    @Test
    @Disabled("BUG #221/#225 (QA 2026-10-22, reproducido): POST /api/ventas con estadoInicial=PAGADO y metodoPago=ONVO crea el pedido PAGADO sin cobro confirmado por ONVO. No se corrige producción en esta rama.")
    @DisplayName("ESPERADO: estadoInicial PAGADO con ONVO (sin cobro) no deja el pedido PAGADO")
    void ventaPagadoConOnvoSinCobro() throws Exception {
        venta("{\"metodoPago\":\"" + Constants.PROVEEDOR_ONVO + "\",\"estadoInicial\":\"PAGADO\",\"items\":[{\"productoId\":"
                + producto.getId() + ",\"cantidad\":1}]}");
        assertThat(pedidoRepository.findAll()).extracting(Pedido::getEstadoPedido)
            .doesNotContain(Constants.PEDIDO_PAGADO);
    }

    // ── PUT /api/pos/qr/{token}/confirmar-sinpe ───────────────────────────────

    @Test
    @DisplayName("confirmar-sinpe: comprador sin pos.usar → 403 y la sesión sigue PENDIENTE")
    void confirmarSinpeComprador403() throws Exception {
        PosQrSesion s = sesionSinpe("tokqrcomprador01", LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        confirmar(s.getToken(), userToken).andExpect(status().isForbidden());
        assertThat(estadoSesion(s)).isEqualTo("PENDIENTE");
        verify(posQrVentaCompletionService, never()).completarVentaSinpe(any(), anyLong(), any());
    }

    @Test
    @DisplayName("confirmar-sinpe: sin token JWT → 401/403")
    void confirmarSinpeSinAuth() throws Exception {
        PosQrSesion s = sesionSinpe("tokqrsinauth0001", LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        mockMvc.perform(put("/api/pos/qr/" + s.getToken() + "/confirmar-sinpe"))
            .andExpect(status().is4xxClientError());
        assertThat(estadoSesion(s)).isEqualTo("PENDIENTE");
    }

    @Test
    @DisplayName("confirmar-sinpe: vendedor de otro negocio → rechazado y sesión intacta")
    void confirmarSinpeOtroNegocio() throws Exception {
        PosQrSesion s = sesionSinpe("tokqrajeno000001", LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        Empresa otra = new Empresa();
        String slug = "otra-qa-" + System.nanoTime();
        otra.setNombreEmpresa("Otra QA"); otra.setSlug(slug); otra.setCorreoEmpresa(slug + "@test.cr");
        otra.setEstadoEmpresa("ACTIVO"); otra.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        otra = empresaRepository.saveAndFlush(otra);
        Usuario ajeno = crearUsuario("ajeno-" + System.nanoTime() + "@test.cr", "Ajeno",
            obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        ajeno.setEmpresa(otra);
        ajeno = usuarioRepository.saveAndFlush(ajeno);
        confirmar(s.getToken(), tokenConEmpresa(ajeno, otra))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not("No hay empresa en el token")));
        assertThat(estadoSesion(s)).isEqualTo("PENDIENTE");
        verify(posQrVentaCompletionService, never()).completarVentaSinpe(any(), anyLong(), any());
    }

    @Test
    @DisplayName("confirmar-sinpe: token inexistente → 400")
    void confirmarSinpeTokenInexistente() throws Exception {
        confirmar("tokqrnoexiste001", tokenConEmpresa(emprendedor, empresa)).andExpect(status().isBadRequest());
        verify(posQrVentaCompletionService, never()).completarVentaSinpe(any(), anyLong(), any());
    }

    @Test
    @DisplayName("confirmar-sinpe: dueño confirma una vez (200); la segunda confirmación → 400 y no completa de nuevo")
    void confirmarSinpeDoble() throws Exception {
        PosQrSesion s = sesionSinpe("tokqrdoble000001", LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        confirmar(s.getToken(), tokenConEmpresa(emprendedor, empresa)).andExpect(status().isOk());
        confirmar(s.getToken(), tokenConEmpresa(emprendedor, empresa)).andExpect(status().isBadRequest());
        verify(posQrVentaCompletionService, times(1)).completarVentaSinpe(any(), eq(emprendedor.getId()), any());
    }

    @Test
    @DisplayName("ESPERADO: confirmar-sinpe con la sesión QR vencida → rechazado, no completa la venta")
    void confirmarSinpeVencido() throws Exception {
        PosQrSesion s = sesionSinpe("tokqrvencido0001", LocalDateTime.now(Constants.ZONA_CR).minusHours(2));
        confirmar(s.getToken(), tokenConEmpresa(emprendedor, empresa)).andExpect(status().isBadRequest());
        verify(posQrVentaCompletionService, never()).completarVentaSinpe(any(), anyLong(), any());
    }

    // ── helpers QA ────────────────────────────────────────────────────────────

    private ResultActions venta(String json) throws Exception {
        return mockMvc.perform(post("/api/ventas").header("Authorization", tokenEmp)
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions confirmar(String token, String auth) throws Exception {
        return mockMvc.perform(put("/api/pos/qr/" + token + "/confirmar-sinpe").header("Authorization", auth)
            .contentType(MediaType.APPLICATION_JSON).content("{\"notas\":\"qa\"}"));
    }

    /** El POS lee empresaId del JWT (claim), no de la BD: tokenPara() no lo incluye. */
    private String tokenConEmpresa(Usuario u, Empresa e) {
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, e.getId(), e.getSlug());
    }

    private Pedido unicoPedido() {
        assertThat(pedidoRepository.findAll()).hasSize(1);
        return pedidoRepository.findAll().get(0);
    }

    private int stock() {
        return productoRepository.findById(producto.getId()).orElseThrow().getStockActual();
    }

    private PosQrSesion sesionSinpe(String token, LocalDateTime expira) {
        PosQrSesion s = new PosQrSesion();
        s.setToken(token);
        s.setEmpresa(empresa);
        s.setUsuario(emprendedor);
        s.setItemsJson("[{\"productoId\":" + producto.getId() + ",\"cantidad\":1}]");
        s.setTotal(10000);
        s.setMetodoPago("SINPE");
        s.setEstado("PENDIENTE");
        s.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR).minusHours(3));
        s.setFechaExpiracion(expira);
        return posQrSesionRepository.saveAndFlush(s);
    }

    private String estadoSesion(PosQrSesion s) {
        return posQrSesionRepository.findById(s.getId()).orElseThrow().getEstado();
    }

    private void assertEstado(Pedido p, String esperado) {
        assertThat(pedidoRepository.findById(p.getId()).orElseThrow().getEstadoPedido()).isEqualTo(esperado);
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
                "paymentIntentId", "pi_" + sessionId))
            .when(onvoService).obtenerCheckoutSession(sessionId);
        doReturn(Map.of("id", "pi_" + sessionId, "status", intentStatus, "amount", centimos, "currency", "CRC"))
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
