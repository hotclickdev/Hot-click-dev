package com.hotclick.integration;

import com.hotclick.controller.AdminPosSinpeController;
import com.hotclick.exception.AutoconfirmacionSinpeException;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.service.pos.ReferenciaSinpe;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
    @Autowired private com.hotclick.repository.PosSinpeConfirmacionRepository confirmacionRepository;
    @Autowired private com.hotclick.repository.AuditoriaAdminRepository auditoriaAdminRepository;

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
    @DisplayName("ESPERADO: estadoInicial PAGADO con TARJETA (sin cobro de pasarela) no deja el pedido PAGADO")
    void ventaPagadoConTarjetaSinCobro() throws Exception {
        venta("{\"metodoPago\":\"TARJETA\",\"estadoInicial\":\"PAGADO\",\"items\":[{\"productoId\":"
                + producto.getId() + ",\"cantidad\":1}]}");
        assertThat(pedidoRepository.findAll()).extracting(Pedido::getEstadoPedido)
            .doesNotContain(Constants.PEDIDO_PAGADO);
    }

    @Test
    @DisplayName("ESPERADO: estadoInicial PAGADO con ONVO (sin cobro) no deja el pedido PAGADO")
    void ventaPagadoConOnvoSinCobro() throws Exception {
        venta("{\"metodoPago\":\"" + Constants.PROVEEDOR_ONVO + "\",\"estadoInicial\":\"PAGADO\",\"items\":[{\"productoId\":"
                + producto.getId() + ",\"cantidad\":1}]}");
        assertThat(pedidoRepository.findAll()).extracting(Pedido::getEstadoPedido)
            .doesNotContain(Constants.PEDIDO_PAGADO);
    }

    @Test
    @DisplayName("/api/ventas: TARJETA con estado pagado/avanzado (cualquier mayúscula) → 400 y no descuenta stock")
    void ventaTarjetaEstadosAvanzados400() throws Exception {
        for (String estado : new String[]{"pagado", "COMPLETADO", " entregado ", "Confirmado"}) {
            venta("{\"metodoPago\":\"tarjeta\",\"estadoInicial\":\"" + estado + "\",\"items\":[{\"productoId\":"
                    + producto.getId() + ",\"cantidad\":1}]}")
                .andExpect(status().isBadRequest());
        }
        assertThat(pedidoRepository.findAll()).isEmpty();
        assertThat(stock()).isEqualTo(50);
    }

    @Test
    @DisplayName("/api/ventas: TARJETA, STRIPE, TILOPAY, ONVO o método desconocido sin estado → PENDIENTE")
    void ventaPasarelaSinEstadoQuedaPendiente() throws Exception {
        for (String metodo : new String[]{"TARJETA", "stripe", "Tilopay", "ONVO", "BITCOIN"}) {
            venta("{\"metodoPago\":\"" + metodo + "\",\"items\":[{\"productoId\":"
                    + producto.getId() + ",\"cantidad\":1}]}")
                .andExpect(status().isOk());
        }
        assertThat(pedidoRepository.findAll()).hasSize(5).extracting(Pedido::getEstadoPedido)
            .containsOnly(Constants.PEDIDO_PENDIENTE);
    }

    @Test
    @DisplayName("/api/ventas: STRIPE, TILOPAY o desconocido con estado distinto de PENDIENTE → 400")
    void ventaOtrasPasarelasConEstado400() throws Exception {
        for (String metodo : new String[]{"STRIPE", "TILOPAY", "DESCONOCIDO"}) {
            venta("{\"metodoPago\":\"" + metodo + "\",\"estadoInicial\":\"COMPLETADO\",\"items\":[{\"productoId\":"
                    + producto.getId() + ",\"cantidad\":1}]}")
                .andExpect(status().isBadRequest());
        }
        assertThat(pedidoRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("/api/ventas: EFECTIVO conserva el estado normalizado; fuera de la lista blanca → 400 sin eco de la entrada")
    void ventaEfectivoListaBlanca() throws Exception {
        venta("{\"metodoPago\":\" efectivo \",\"estadoInicial\":\" pagado \",\"items\":[{\"productoId\":"
                + producto.getId() + ",\"cantidad\":1}]}").andExpect(status().isOk());
        venta("{\"metodoPago\":\"EFECTIVO\",\"estadoInicial\":\"INVENTADO<script>\",\"items\":[{\"productoId\":"
                + producto.getId() + ",\"cantidad\":1}]}")
            .andExpect(status().isBadRequest())
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("INVENTADO"))));
        Pedido p = unicoPedido();
        assertThat(p.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
        assertThat(p.getMetodoPago()).isEqualTo("EFECTIVO");
    }

    @Test
    @DisplayName("/api/ventas: SINPE (G1, solo se confirma por ONVO) con estado cerrado → 400 sin eco del método")
    void ventaSinpeCerrada400() throws Exception {
        for (String estado : new String[]{"PAGADO", "Entregado", "COMPLETADO", "confirmado"}) {
            venta("{\"metodoPago\":\"sinpe\",\"estadoInicial\":\"" + estado + "\",\"items\":[{\"productoId\":"
                    + producto.getId() + ",\"cantidad\":1}]}")
                .andExpect(status().isBadRequest())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("sinpe"))));
        }
        assertThat(pedidoRepository.findAll()).isEmpty();
        assertThat(stock()).isEqualTo(50);
    }

    @Test
    @DisplayName("/api/ventas: SINPE sin estado → PENDIENTE y método guardado normalizado")
    void ventaSinpePendienteNormalizada() throws Exception {
        venta("{\"metodoPago\":\" sinpe \",\"items\":[{\"productoId\":"
                + producto.getId() + ",\"cantidad\":1}]}").andExpect(status().isOk());
        Pedido p = unicoPedido();
        assertThat(p.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(p.getMetodoPago()).isEqualTo(Constants.PROVEEDOR_SINPE);
    }

    @Test
    @DisplayName("/api/ventas: método de pasarela se guarda normalizado (\" tarjeta \" → TARJETA)")
    void ventaMetodoGuardadoNormalizado() throws Exception {
        venta("{\"metodoPago\":\" tarjeta \",\"items\":[{\"productoId\":"
                + producto.getId() + ",\"cantidad\":1}]}").andExpect(status().isOk());
        assertThat(unicoPedido().getMetodoPago()).isEqualTo("TARJETA");
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
    @DisplayName("confirmar-sinpe: otro usuario del negocio confirma una vez (200); la segunda → 400 y no completa de nuevo")
    void confirmarSinpeDoble() throws Exception {
        PosQrSesion s = sesionSinpe("tokqrdoble000001", LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        Usuario cajero = cajero();
        confirmar(s.getToken(), tokenConEmpresa(cajero, empresa), "REF000111").andExpect(status().isOk());
        confirmar(s.getToken(), tokenConEmpresa(cajero, empresa), "REF000222").andExpect(status().isBadRequest());
        verify(posQrVentaCompletionService, times(1)).completarVentaSinpe(any(), eq(cajero.getId()), any());
    }

    @Test
    @DisplayName("(a) confirmar-sinpe sin referencia o con formato inválido → 400 con mensaje fijo, sin eco ni venta")
    void confirmarSinpeReferenciaInvalida() throws Exception {
        PosQrSesion s = sesionSinpe("tokqrrefinval001", LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        String auth = tokenConEmpresa(cajero(), empresa);
        long previas = confirmacionRepository.count();
        mockMvc.perform(put("/api/pos/qr/" + s.getToken() + "/confirmar-sinpe").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"notas\":\"qa\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(ReferenciaSinpe.MSG_INVALIDA));
        for (String ref : new String[]{"12345", "pagó por sinpe", "REF<b>99999", "ZZ-123456", "A".repeat(31)}) {
            confirmar(s.getToken(), auth, ref)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(ReferenciaSinpe.MSG_INVALIDA));
        }
        assertThat(estadoSesion(s)).isEqualTo("PENDIENTE");
        assertThat(confirmacionRepository.count()).isEqualTo(previas);
        verify(posQrVentaCompletionService, never()).completarVentaSinpe(any(), anyLong(), any());
    }

    @Test
    @DisplayName("(a) confirmar-sinpe con una referencia ya usada en el negocio → 400 y la segunda sesión sigue PENDIENTE")
    void confirmarSinpeReferenciaRepetida() throws Exception {
        PosQrSesion s1 = sesionSinpe("tokqrrefrep00001", LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        PosQrSesion s2 = sesionSinpe("tokqrrefrep00002", LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        String auth = tokenConEmpresa(cajero(), empresa);
        long previas = confirmacionRepository.count();
        confirmar(s1.getToken(), auth, "FT2610220001").andExpect(status().isOk());
        confirmar(s2.getToken(), auth, " ft2610220001 ")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(ReferenciaSinpe.MSG_REPETIDA));
        assertThat(estadoSesion(s2)).isEqualTo("PENDIENTE");
        assertThat(confirmacionRepository.count()).isEqualTo(previas + 1);
    }

    @Test
    @DisplayName("(b) confirmar-sinpe deja registro inmutable (quién generó, quién confirmó, cuándo, referencia) y auditoría")
    void confirmarSinpeRegistraAuditoria() throws Exception {
        PosQrSesion s = sesionSinpe("tokqrauditoria01", LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        Usuario cajero = cajero();
        LocalDateTime antes = LocalDateTime.now(Constants.ZONA_CR).minusSeconds(1);
        confirmar(s.getToken(), tokenConEmpresa(cajero, empresa), "abc778899").andExpect(status().isOk());

        var regs = confirmacionRepository.findByEmpresaIdOrderByFechaConfirmacionDesc(empresa.getId(),
            org.springframework.data.domain.PageRequest.of(0, 100)).getContent().stream()
            .filter(x -> s.getId().equals(x.getSesionId())).toList();
        assertThat(regs).hasSize(1);
        var r = regs.get(0);
        assertThat(r.getReferencia()).isEqualTo("ABC778899");
        assertThat(r.getSesionId()).isEqualTo(s.getId());
        assertThat(r.getGeneradoPorId()).isEqualTo(emprendedor.getId());
        assertThat(r.getConfirmadoPorId()).isEqualTo(cajero.getId());
        assertThat(r.getTotal()).isEqualTo(10000);
        assertThat(r.getFechaConfirmacion()).isAfter(antes);

        var audits = auditoriaAdminRepository.findAllByOrderByFechaDesc(
            org.springframework.data.domain.PageRequest.of(0, 100)).getContent().stream()
            .filter(a -> PosQrVentaService.AUDIT_SINPE_MANUAL.equals(a.getAccion()))
            .filter(a -> r.getId().equals(a.getEntidadId())).toList();
        assertThat(audits).hasSize(1);
        assertThat(audits.get(0).getAdminId()).isEqualTo(cajero.getId());
        assertThat(audits.get(0).getEntidadId()).isEqualTo(r.getId());
        assertThat(audits.get(0).getDetalle()).contains("ref=ABC778899").contains("confirmo=" + cajero.getId());
    }

    @Test
    @DisplayName("(c) confirmar-sinpe por quien generó la venta → 403 AUTOCONFIRMACION_SINPE y sesión PENDIENTE")
    void confirmarSinpeMismoUsuario403() throws Exception {
        PosQrSesion s = sesionSinpe("tokqrmismo000001", LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        long previas = confirmacionRepository.count();
        confirmar(s.getToken(), tokenConEmpresa(emprendedor, empresa), "REF123456")
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.data.codigo").value(AutoconfirmacionSinpeException.CODIGO));
        assertThat(estadoSesion(s)).isEqualTo("PENDIENTE");
        assertThat(confirmacionRepository.count()).isEqualTo(previas);
        verify(posQrVentaCompletionService, never()).completarVentaSinpe(any(), anyLong(), any());
    }

    @Test
    @DisplayName("(d) lista de revisión: el negocio ve sus confirmaciones; comprador 403; otro negocio no las ve")
    void listaRevisionSinpeManual() throws Exception {
        PosQrSesion s = sesionSinpe("tokqrrevision001", LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        confirmar(s.getToken(), tokenConEmpresa(cajero(), empresa), "REV556677").andExpect(status().isOk());

        mockMvc.perform(get(AdminPosSinpeController.RUTA).header("Authorization", tokenConEmpresa(emprendedor, empresa)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(1))
            .andExpect(jsonPath("$.data.items[0].referencia").value("REV556677"))
            .andExpect(jsonPath("$.data.items[0].confirmadoPorId").isNumber());
        mockMvc.perform(get(AdminPosSinpeController.RUTA).header("Authorization", userToken))
            .andExpect(status().isForbidden());
        mockMvc.perform(get(AdminPosSinpeController.RUTA)).andExpect(status().is4xxClientError());

        Empresa otra = new Empresa();
        String slug = "otra-rev-" + System.nanoTime();
        otra.setNombreEmpresa("Otra Rev"); otra.setSlug(slug); otra.setCorreoEmpresa(slug + "@test.cr");
        otra.setEstadoEmpresa("ACTIVO"); otra.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        otra = empresaRepository.saveAndFlush(otra);
        Usuario ajeno = crearUsuario("rev-" + System.nanoTime() + "@test.cr", "Rev",
            obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        ajeno.setEmpresa(otra);
        ajeno = usuarioRepository.saveAndFlush(ajeno);
        mockMvc.perform(get(AdminPosSinpeController.RUTA).header("Authorization", tokenConEmpresa(ajeno, otra)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    @Disabled("BUG (QA 2026-10-22, reproducido): PUT /api/pos/qr/{token}/confirmar-sinpe acepta una sesión con fechaExpiracion vencida (200); PosQrVentaService.confirmarSinpe no valida expiración. Relacionado #220. No se corrige producción en esta rama.")
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
        return confirmar(token, auth, "REF" + (100000 + (++secuencia)));
    }

    private ResultActions confirmar(String token, String auth, String referencia) throws Exception {
        return mockMvc.perform(put("/api/pos/qr/" + token + "/confirmar-sinpe").header("Authorization", auth)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"notas\":\"qa\",\"referencia\":\"" + referencia + "\"}"));
    }

    /** Segundo usuario del mismo negocio (no generó la sesión): puede confirmar SINPE. */
    private Usuario cajero() {
        Usuario c = crearUsuario("cajero-" + System.nanoTime() + "@test.cr", "Cajero",
            obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        c.setEmpresa(empresa);
        return usuarioRepository.saveAndFlush(c);
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
