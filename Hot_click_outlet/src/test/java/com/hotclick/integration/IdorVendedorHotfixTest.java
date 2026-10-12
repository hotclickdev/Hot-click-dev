package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Hotfix IDOR vendedor (docs: /workspace/seguridad/IDOR_vendedor.md, IDOR-01..08 y 11).
 * Tres atacantes por endpoint: comprador, vendedor sin empresa y vendedor de otro negocio (B),
 * más los casos positivos del dueño (A) y del ADMIN.
 */
@DisplayName("[CRÍTICO] Hotfix IDOR vendedor: empresa nula nunca ve todo")
class IdorVendedorHotfixTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;

    private Empresa empresaA;
    private Empresa empresaB;
    private Usuario duenoA;
    private String tokenA;
    private String tokenB;
    private String tokenSinEmpresa;
    private Categoria categoria;
    private Bodega bodegaA;
    private Producto productoA;
    private Pedido pedidoA;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empresaA = crearEmpresa("Idor Alpha", "idor-alpha", "idor-a@test.cr");
        empresaB = crearEmpresa("Idor Beta", "idor-beta", "idor-b@test.cr");
        duenoA = conEmpresa(crearUsuario("idor-dueno-a@test.cr", "Dueno A", rolEmp), empresaA);
        Usuario vendedorB = conEmpresa(crearUsuario("idor-vend-b@test.cr", "Vend B", rolEmp), empresaB);
        Usuario sinEmpresa = crearUsuario("idor-sin-empresa@test.cr", "Sin Empresa", rolEmp);
        tokenA = tokenPara(duenoA, Constants.ROL_EMPRENDEDOR);
        tokenB = tokenPara(vendedorB, Constants.ROL_EMPRENDEDOR);
        tokenSinEmpresa = tokenPara(sinEmpresa, Constants.ROL_EMPRENDEDOR);

        categoria = categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Cat-Idor");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
        bodegaA = crearBodega("Bodega Idor A", empresaA);
        crearBodega("Bodega Idor B", empresaB);
        productoA = crearProducto("Producto Idor A", "SKU-IDOR-A", empresaA, 10);
        pedidoA = crearPedido("ORD-IDOR-A1", empresaA);
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        jdbcTemplate.update("DELETE FROM hot_click_producto_imagen_tb");
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        usuarioRepository.findAll().stream().filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── Helpers de aserción ────────────────────────────────────────────────────

    private MockHttpServletRequestBuilder req(HttpMethod m, String url, String body) {
        MockHttpServletRequestBuilder b = request(m, url);
        if (body != null) b.contentType(MediaType.APPLICATION_JSON).content(body);
        return b;
    }

    /** Comprador y vendedor sin empresa → 403 (y opcionalmente el vendedor de otro negocio). */
    private void rechaza(HttpMethod m, String url, String body, boolean tambienOtroNegocio) throws Exception {
        mockMvc.perform(req(m, url, body).header("Authorization", userToken)).andExpect(status().isForbidden());
        mockMvc.perform(req(m, url, body).header("Authorization", tokenSinEmpresa)).andExpect(status().isForbidden());
        if (tambienOtroNegocio) {
            mockMvc.perform(req(m, url, body).header("Authorization", tokenB)).andExpect(status().isForbidden());
        }
    }

    private void permite(HttpMethod m, String url, String body, String token) throws Exception {
        mockMvc.perform(req(m, url, body).header("Authorization", token)).andExpect(status().isOk());
    }

    // ── IDOR-01 ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("IDOR-01 | /api/productos/admin/todos: sin empresa o comprador → 403; B no ve A; dueño y ADMIN sí")
    void idor01_listadoGestion() throws Exception {
        rechaza(HttpMethod.GET, "/api/productos/admin/todos?size=200", null, false);
        mockMvc.perform(get("/api/productos/admin/todos?size=200").header("Authorization", tokenB))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[*].id", not(hasItem(productoA.getId().intValue()))));
        mockMvc.perform(get("/api/productos/admin/todos?size=200").header("Authorization", tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[*].id", hasItem(productoA.getId().intValue())))
            .andExpect(jsonPath("$.data.content[0].precioCompra").exists());
        permite(HttpMethod.GET, "/api/productos/admin/todos", null, adminToken);
    }

    @Test
    @DisplayName("IDOR-01 | precioCompra oculto para quien no es dueño (B, sin empresa, comprador)")
    void idor01_precioCompraSoloDueno() throws Exception {
        String url = "/api/productos/" + productoA.getId();
        for (String t : new String[]{tokenB, tokenSinEmpresa, userToken}) {
            mockMvc.perform(get(url).header("Authorization", t))
                .andExpect(jsonPath("$.data.precioCompra").doesNotExist());
        }
        mockMvc.perform(get(url).header("Authorization", tokenA))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.precioCompra").value(7000));
    }

    // ── IDOR-02 ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("IDOR-02 | /api/ventas y /api/ventas/clientes: comprador y sin empresa → 403; dueño 200")
    void idor02_ventas() throws Exception {
        rechaza(HttpMethod.GET, "/api/ventas?size=300", null, false);
        rechaza(HttpMethod.GET, "/api/ventas/clientes", null, false);
        permite(HttpMethod.GET, "/api/ventas", null, tokenA);
        permite(HttpMethod.GET, "/api/ventas/clientes", null, tokenA);
    }

    // ── IDOR-03 ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("IDOR-03 | /api/stock: comprador, sin empresa y B → 403 sin tocar stock; dueño 200")
    void idor03_stock() throws Exception {
        String ajuste = "/api/stock/ajuste-entrada/" + productoA.getId();
        rechaza(HttpMethod.POST, ajuste, "{\"cantidad\":5}", true);
        rechaza(HttpMethod.GET, "/api/stock/movimientos/" + productoA.getId(), null, true);
        assertThat(productoRepository.findById(productoA.getId()).orElseThrow().getStockActual()).isEqualTo(10);
        permite(HttpMethod.POST, ajuste, "{\"cantidad\":5}", tokenA);
        permite(HttpMethod.GET, "/api/stock/movimientos/" + productoA.getId(), null, tokenA);
    }

    // ── IDOR-04 ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("IDOR-04 | imágenes de producto: comprador, sin empresa y B → 403; dueño 200")
    void idor04_imagenes() throws Exception {
        String base = "/api/productos/" + productoA.getId() + "/imagenes";
        String urls = "{\"urls\":[\"https://evil.example/x.jpg\"]}";
        rechaza(HttpMethod.PUT, base, urls, true);
        rechaza(HttpMethod.POST, base, "{\"urlImagen\":\"https://evil.example/x.jpg\"}", true);
        rechaza(HttpMethod.DELETE, base + "/999999", null, true);
        assertThat(productoRepository.findById(productoA.getId()).orElseThrow().getImagenPrincipalUrl())
            .isNotEqualTo("https://evil.example/x.jpg");
        permite(HttpMethod.PUT, base, "{\"urls\":[\"https://cdn.example/ok.jpg\"]}", tokenA);
    }

    // ── IDOR-05 ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("IDOR-05 | CRM: comprador y sin empresa → 403; B no edita clientes de A; ADMIN lista")
    void idor05_crm() throws Exception {
        rechaza(HttpMethod.GET, "/api/crm/clientes", null, false);
        rechaza(HttpMethod.GET, "/api/crm/clientes/buscar?q=test", null, false);
        String ficha = "/api/crm/clientes/" + testUser.getId();
        rechaza(HttpMethod.PUT, ficha, "{\"puntosFidelidad\":999999}", true);
        rechaza(HttpMethod.GET, ficha + "/wa/historial", null, true);
        permite(HttpMethod.GET, "/api/crm/clientes", null, adminToken);
    }

    // ── IDOR-06 ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("IDOR-06 | /api/pedidos y /pendientes: comprador y sin empresa → 403; B no ve los de A")
    void idor06_pedidos() throws Exception {
        rechaza(HttpMethod.GET, "/api/pedidos", null, false);
        rechaza(HttpMethod.GET, "/api/pedidos/pendientes", null, false);
        mockMvc.perform(get("/api/pedidos/pendientes").header("Authorization", tokenB))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].id", not(hasItem(pedidoA.getId().intValue()))));
        mockMvc.perform(get("/api/pedidos/pendientes").header("Authorization", tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].id", hasItem(pedidoA.getId().intValue())));
        permite(HttpMethod.GET, "/api/pedidos", null, adminToken);
    }

    // ── IDOR-07 ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("IDOR-07 | /api/admin/pagos, /pagos/kpis y /dashboard: comprador y sin empresa → 403")
    void idor07_adminPagosDashboard() throws Exception {
        for (String url : new String[]{"/api/admin/pagos", "/api/admin/pagos/kpis", "/api/admin/dashboard"}) {
            rechaza(HttpMethod.GET, url, null, false);
            permite(HttpMethod.GET, url, null, tokenA);
            permite(HttpMethod.GET, url, null, adminToken);
        }
    }

    // ── IDOR-08 ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("IDOR-08 | oferta por categoría y archivar sin stock: sin empresa → 403; B no toca A")
    void idor08_operacionesMasivas() throws Exception {
        String oferta = "/api/productos/oferta/categoria/" + categoria.getId();
        String body = "{\"enOferta\":true,\"porcentajeDescuento\":90}";
        rechaza(HttpMethod.POST, oferta, body, false);
        rechaza(HttpMethod.POST, "/api/productos/archivar-sin-stock", null, false);

        Producto agotadoA = crearProducto("Agotado Idor A", "SKU-IDOR-A0", empresaA, 0);
        permite(HttpMethod.POST, oferta, body, tokenB);
        permite(HttpMethod.POST, "/api/productos/archivar-sin-stock", null, tokenB);

        assertThat(productoRepository.findById(productoA.getId()).orElseThrow().getEnOferta()).isFalse();
        assertThat(productoRepository.findById(agotadoA.getId()).orElseThrow().getEstado())
            .isEqualTo(Constants.ESTADO_ACTIVO);
    }

    // ── IDOR-11 ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("IDOR-11 | POST /api/ventas: B no vende productos de A; comprador y sin empresa → 403")
    void idor11_ventaProductoAjeno() throws Exception {
        String venta = "{\"metodoPago\":\"EFECTIVO\",\"items\":[{\"productoId\":" + productoA.getId() + ",\"cantidad\":3}]}";
        rechaza(HttpMethod.POST, "/api/ventas", venta, false);
        mockMvc.perform(post("/api/ventas").header("Authorization", tokenB)
                .contentType(MediaType.APPLICATION_JSON).content(venta))
            .andExpect(status().is4xxClientError());
        assertThat(productoRepository.findById(productoA.getId()).orElseThrow().getStockActual()).isEqualTo(10);
        permite(HttpMethod.POST, "/api/ventas", venta, tokenA);
        assertThat(productoRepository.findById(productoA.getId()).orElseThrow().getStockActual()).isEqualTo(7);
    }

    // ── Datos ─────────────────────────────────────────────────────────────────

    private Empresa crearEmpresa(String nombre, String slug, String correo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario conEmpresa(Usuario u, Empresa empresa) {
        u.setEmpresa(empresa);
        return usuarioRepository.saveAndFlush(u);
    }

    private Bodega crearBodega(String nombre, Empresa empresa) {
        Bodega b = new Bodega();
        b.setNombreBodega(nombre);
        b.setDireccionExacta("Calle Test 1");
        b.setTelefono("88880000");
        b.setHorarioApertura(LocalTime.of(8, 0));
        b.setHorarioCierre(LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Producto crearProducto(String nombre, String sku, Empresa empresa, int stock) {
        Producto p = new Producto();
        p.setNombreProducto(nombre);
        p.setSku(sku);
        p.setPrecioVenta(10000);
        p.setPrecioCompra(7000);
        p.setStockActual(stock);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(bodegaA);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }

    private Pedido crearPedido(String numero, Empresa empresa) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodegaA);
        p.setEmpresa(empresa);
        p.setSubtotal(10000);
        p.setTotalPedido(10000);
        p.setCostoTotalProductos(7000);
        p.setUtilidadBruta(3000);
        p.setMetodoPago("SINPE");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new java.util.ArrayList<>());
        return pedidoRepository.saveAndFlush(p);
    }
}
