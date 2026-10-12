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
 * IDOR-09, IDOR-10 y queries «(:empresaId IS NULL OR …)» (sigue al hotfix IDOR vendedor).
 * Tres atacantes por endpoint: comprador, vendedor sin empresa y vendedor de otro negocio (B),
 * más los casos positivos del dueño (A) y del ADMIN.
 */
@DisplayName("[CRÍTICO] IDOR pendientes: bulk sin empresa, detalle no publicable, queries con empresa nula")
class IdorPendientesTest extends BaseIntegrationTest {

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

    // ── IDOR-09 ───────────────────────────────────────────────────────────────

    private String productoJson(String nombre, String sku) {
        return String.format("[{\"nombreProducto\":\"%s\",\"sku\":\"%s\",\"precioVenta\":5000,\"precioCompra\":3000,"
            + "\"stockActual\":1,\"stockMinimo\":1,\"categoriaId\":%d,\"bodegaId\":%d}]",
            nombre, sku, categoria.getId(), bodegaA.getId());
    }

    private long huerfanos() {
        return productoRepository.findAll().stream().filter(p -> p.getEmpresa() == null).count();
    }

    @Test
    @DisplayName("IDOR-09 | POST /api/productos/bulk: comprador y sin empresa → 403, nunca huérfanos; dueño crea en su empresa")
    void idor09_bulkSinEmpresa() throws Exception {
        rechaza(HttpMethod.POST, "/api/productos/bulk", productoJson("Huerfano", "SKU-HUERF-1"), false);
        mockMvc.perform(post("/api/productos/bulk").header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(productoJson("Huerfano Admin", "SKU-HUERF-2")))
            .andExpect(status().isForbidden());
        assertThat(huerfanos()).isZero();

        mockMvc.perform(post("/api/productos/bulk").header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(productoJson("Bulk A", "SKU-BULK-A1")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.ok").value(1));
        assertThat(productoRepository.findAll()).filteredOn(p -> "Bulk A".equals(p.getNombreProducto()))
            .singleElement().satisfies(p -> assertThat(p.getEmpresaId()).isEqualTo(empresaA.getId()));
        assertThat(huerfanos()).isZero();
    }

    // ── IDOR-10 ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("IDOR-10 | detalle de producto inactivo, oculto o de negocio no aprobado → 404 para anónimo, comprador y sin empresa")
    void idor10_detalleNoPublicable() throws Exception {
        Producto inactivo = crearProducto("Inactivo A", "SKU-IDOR-IN", empresaA, 3);
        inactivo.setEstado(0);
        productoRepository.saveAndFlush(inactivo);
        Producto borrado = crearProducto("Borrado A", "SKU-IDOR-BO", empresaA, 3);
        borrado.setEstado(Constants.ESTADO_ELIMINADO);
        productoRepository.saveAndFlush(borrado);
        Producto oculto = crearProducto("Oculto A", "SKU-IDOR-OC", empresaA, 3);
        oculto.setVisibleCatalogo(false);
        productoRepository.saveAndFlush(oculto);
        Empresa pendiente = crearEmpresa("Idor Pendiente", "idor-pendiente", "idor-p@test.cr");
        pendiente.setEstadoEmpresa("PENDIENTE");
        empresaRepository.saveAndFlush(pendiente);
        Producto deNoAprobado = crearProducto("De Pendiente", "SKU-IDOR-PE", pendiente, 3);
        Empresa invisible = crearEmpresa("Idor Invisible", "idor-invisible", "idor-i@test.cr");
        invisible.setVisibilidadPublica(false);
        empresaRepository.saveAndFlush(invisible);
        Producto deInvisible = crearProducto("De Invisible", "SKU-IDOR-IV", invisible, 3);

        for (Producto p : new Producto[]{inactivo, borrado, oculto, deNoAprobado, deInvisible}) {
            String url = "/api/productos/" + p.getId();
            mockMvc.perform(get(url)).andExpect(status().isNotFound());
            mockMvc.perform(get(url).header("Authorization", userToken)).andExpect(status().isNotFound());
            mockMvc.perform(get(url).header("Authorization", tokenSinEmpresa)).andExpect(status().isNotFound());
            mockMvc.perform(get(url).header("Authorization", tokenB)).andExpect(status().isNotFound());
            permite(HttpMethod.GET, url, null, adminToken);
        }
        permite(HttpMethod.GET, "/api/productos/" + inactivo.getId(), null, tokenA);
        permite(HttpMethod.GET, "/api/productos/" + oculto.getId(), null, tokenA);
        // Publicable: sigue abierto al público
        mockMvc.perform(get("/api/productos/" + productoA.getId())).andExpect(status().isOk());
        permite(HttpMethod.GET, "/api/productos/" + productoA.getId(), null, userToken);
        // ESC-1: un vendedor de otro negocio navega el marketplace como cualquiera
        permite(HttpMethod.GET, "/api/productos/" + productoA.getId(), null, tokenB);
    }

    // ── (:empresaId IS NULL OR …) — métricas de ads ──────────────────────────

    @Test
    @DisplayName("Ads | /api/admin/ads/*: comprador y sin empresa → 403 (antes métricas globales); dueño y ADMIN 200")
    void ads_metricasSinEmpresa() throws Exception {
        rechaza(HttpMethod.GET, "/api/admin/ads/metricas", null, false);
        rechaza(HttpMethod.GET, "/api/admin/ads/gastos", null, false);
        permite(HttpMethod.GET, "/api/admin/ads/metricas", null, tokenA);
        permite(HttpMethod.GET, "/api/admin/ads/metricas", null, adminToken);
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
