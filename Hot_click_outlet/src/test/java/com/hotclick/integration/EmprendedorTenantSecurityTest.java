package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * NIVEL: CRÍTICO — 20 tests
 *
 * Verifica aislamiento multi-tenant entre empresas:
 * - Empresa A no puede ver, modificar ni eliminar recursos de Empresa B.
 * - ADMIN_IT puede acceder a todo (control positivo).
 */
@DisplayName("[CRÍTICO] Aislamiento multi-tenant entre empresas (EmprendedorTenantSecurity)")
class EmprendedorTenantSecurityTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository     empresaRepository;
    @Autowired private ProductoRepository    productoRepository;
    @Autowired private PedidoRepository      pedidoRepository;
    @Autowired private BodegaRepository      bodegaRepository;
    @Autowired private CategoriaRepository   categoriaRepository;

    // ── Datos de las dos empresas ─────────────────────────────────────────────
    private Empresa empresaA;
    private Empresa empresaB;
    private Usuario emprendedorA;
    private Usuario emprendedorB;
    private String  tokenA;
    private String  tokenB;
    private Producto productoA;
    private Producto productoB;
    private Pedido   pedidoA;
    private Pedido   pedidoB;
    private Bodega   bodegaA;
    private Categoria categoria;

    @BeforeEach
    void setUpTenants() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);

        empresaA = crearEmpresa("Empresa Alpha", "empresa-alpha", "alpha@test.cr");
        empresaB = crearEmpresa("Empresa Beta",  "empresa-beta",  "beta@test.cr");

        emprendedorA = crearEmprendedor("emprA@test.cr", "Empr A", rolEmp, empresaA);
        emprendedorB = crearEmprendedor("emprB@test.cr", "Empr B", rolEmp, empresaB);

        tokenA = "Bearer " + jwtUtil.generateToken(emprendedorA.getCorreo(), emprendedorA.getId(), Constants.ROL_EMPRENDEDOR);
        tokenB = "Bearer " + jwtUtil.generateToken(emprendedorB.getCorreo(), emprendedorB.getId(), Constants.ROL_EMPRENDEDOR);

        categoria = obtenerOCrearCategoria();
        bodegaA   = crearBodega("Bodega A", adminUser, empresaA);

        productoA = crearProducto("Producto Alpha 001", "SKU-TA-001", empresaA);
        productoB = crearProducto("Producto Beta 001",  "SKU-TB-001", empresaB);

        pedidoA = crearPedido("ORD-SEC-A01", testUser, bodegaA, empresaA);
        pedidoB = crearPedido("ORD-SEC-B01", testUser, bodegaA, empresaB);
    }

    @AfterEach
    void tearDownTenants() {
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── T-SEC-001: EmprendedorA no puede cambiar estado de pedido de EmpresaB ─
    @Test
    @DisplayName("T-SEC-001 | CRÍTICO — EmprendedorA no puede cambiar estado de pedido de EmpresaB → 403")
    void emprendedorA_cannotChangeEstado_pedidoB() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedidoB.getId() + "/estado")
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"CANCELADO\"}"))
            .andExpect(status().isForbidden());
    }

    // ── T-SEC-002: EmprendedorA no puede asignar guía a pedido de EmpresaB ───
    @Test
    @DisplayName("T-SEC-002 | CRÍTICO — EmprendedorA no puede asignar guía a pedido de EmpresaB → 403")
    void emprendedorA_cannotAsignarGuia_pedidoB() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedidoB.getId() + "/guia")
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"numeroGuia\":\"CR000000000CR\"}"))
            .andExpect(status().isForbidden());
    }

    // ── T-SEC-003: EmprendedorA no puede procesar envío de pedido de EmpresaB
    @Test
    @DisplayName("T-SEC-003 | CRÍTICO — EmprendedorA no puede procesar envío de pedido de EmpresaB → 403")
    void emprendedorA_cannotProcesarEnvio_pedidoB() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedidoB.getId() + "/envio")
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guia\":\"CR000000000CR\",\"costoEnvio\":2500}"))
            .andExpect(status().isForbidden());
    }

    // ── T-SEC-004: EmprendedorA no puede eliminar pedido de EmpresaB ─────────
    @Test
    @DisplayName("T-SEC-004 | CRÍTICO — EmprendedorA no puede eliminar pedido de EmpresaB → 403")
    void emprendedorA_cannotDelete_pedidoB() throws Exception {
        mockMvc.perform(delete("/api/pedidos/" + pedidoB.getId())
                .header("Authorization", tokenA))
            .andExpect(status().isForbidden());
    }

    // ── T-SEC-005: EmprendedorA no puede notificar cliente de pedido de EmpresaB
    @Test
    @DisplayName("T-SEC-005 | CRÍTICO — EmprendedorA no puede enviar email de pedido de EmpresaB → 403")
    void emprendedorA_cannotNotificar_pedidoB() throws Exception {
        mockMvc.perform(post("/api/pedidos/" + pedidoB.getId() + "/notificar")
                .header("Authorization", tokenA))
            .andExpect(status().isForbidden());
    }

    // ── T-SEC-006: EmprendedorA no puede actualizar producto de EmpresaB ─────
    @Test
    @DisplayName("T-SEC-006 | CRÍTICO — EmprendedorA no puede actualizar producto de EmpresaB → 400/403")
    void emprendedorA_cannotUpdate_productoB() throws Exception {
        String body = "{\"nombreProducto\":\"Hack\",\"precioVenta\":100,\"precioCompra\":50,"
            + "\"stockActual\":5,\"stockMinimo\":1,\"categoriaId\":" + categoria.getId() + "}";
        mockMvc.perform(put("/api/productos/" + productoB.getId())
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().is4xxClientError());
    }

    // ── T-SEC-007: EmprendedorA no puede eliminar producto de EmpresaB ───────
    @Test
    @DisplayName("T-SEC-007 | CRÍTICO — EmprendedorA no puede eliminar producto de EmpresaB → 400/403")
    void emprendedorA_cannotDelete_productoB() throws Exception {
        mockMvc.perform(delete("/api/productos/" + productoB.getId())
                .header("Authorization", tokenA))
            .andExpect(status().is4xxClientError());
    }

    // ── T-SEC-008: EmprendedorA no puede poner en carrusel producto de EmpresaB
    @Test
    @DisplayName("T-SEC-008 | CRÍTICO — EmprendedorA no puede togglear carrusel de producto de EmpresaB → 403")
    void emprendedorA_cannotToggleCarrusel_productoB() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoB.getId() + "/carrusel")
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enCarrusel\":true,\"orden\":1}"))
            .andExpect(status().isForbidden());
    }

    // ── T-SEC-009: EmprendedorA no puede destacar producto de EmpresaB ───────
    @Test
    @DisplayName("T-SEC-009 | CRÍTICO — EmprendedorA no puede destacar producto de EmpresaB → 403")
    void emprendedorA_cannotToggleDestacado_productoB() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoB.getId() + "/destacado")
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"destacado\":true}"))
            .andExpect(status().isForbidden());
    }

    // ── T-SEC-010: EmprendedorA no puede acceder a endpoints exclusivos ADMIN_IT
    @Test
    @DisplayName("T-SEC-010 | CRÍTICO — EmprendedorA no puede listar todas las empresas → 403")
    void emprendedorA_cannotListEmpresas() throws Exception {
        mockMvc.perform(get("/api/admin/empresas")
                .header("Authorization", tokenA))
            .andExpect(status().isForbidden());
    }

    // ── T-SEC-011: EmprendedorA no puede ver lista global de usuarios ─────────
    @Test
    @DisplayName("T-SEC-011 | CRÍTICO — EmprendedorA no puede listar todos los usuarios → 403")
    void emprendedorA_cannotListAllUsuarios() throws Exception {
        mockMvc.perform(get("/api/usuarios")
                .header("Authorization", tokenA))
            .andExpect(status().isForbidden());
    }

    // ── T-SEC-012: EmprendedorB no puede modificar pedido de EmpresaA ────────
    @Test
    @DisplayName("T-SEC-012 | CRÍTICO — EmprendedorB no puede cambiar estado de pedido de EmpresaA → 403")
    void emprendedorB_cannotChangeEstado_pedidoA() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedidoA.getId() + "/estado")
                .header("Authorization", tokenB)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"CANCELADO\"}"))
            .andExpect(status().isForbidden());
    }

    // ── T-SEC-013: ADMIN_IT sí puede cambiar estado de cualquier pedido ───────
    @Test
    @DisplayName("T-SEC-013 | CRÍTICO — ADMIN_IT puede cambiar estado de pedido de cualquier empresa → 200")
    void adminIT_canChangeEstado_anyPedido() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedidoA.getId() + "/estado")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"ENVIADO\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-SEC-014: ADMIN_IT puede eliminar pedido de cualquier empresa ────────
    @Test
    @DisplayName("T-SEC-014 | CRÍTICO — ADMIN_IT puede eliminar pedido de cualquier empresa → 200")
    void adminIT_canDelete_anyPedido() throws Exception {
        mockMvc.perform(delete("/api/pedidos/" + pedidoB.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isOk());
    }

    // ── T-SEC-015: Request sin token a endpoint protegido → 401 ──────────────
    @Test
    @DisplayName("T-SEC-015 | CRÍTICO — Sin token en endpoint de pedidos → 401")
    void noToken_pedidoEndpoint_returns401() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedidoA.getId() + "/estado")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"CANCELADO\"}"))
            .andExpect(status().isUnauthorized());
    }

    // ── T-SEC-016: USUARIO_FINAL no puede cambiar estado de pedidos ──────────
    @Test
    @DisplayName("T-SEC-016 | CRÍTICO — USUARIO_FINAL no puede cambiar estado de pedido → 403")
    void usuarioFinal_cannotChangeEstado() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedidoA.getId() + "/estado")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"ENVIADO\"}"))
            .andExpect(status().isForbidden());
    }

    // ── T-SEC-017: EmprendedorA puede cambiar estado de su propio pedido ─────
    @Test
    @DisplayName("T-SEC-017 | CRÍTICO — EmprendedorA puede cambiar estado de su propio pedido → 200")
    void emprendedorA_canChangeEstado_ownPedido() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedidoA.getId() + "/estado")
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"EN_PREPARACION\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-SEC-018: EmprendedorA puede asignar guía a su propio pedido ────────
    @Test
    @DisplayName("T-SEC-018 | CRÍTICO — EmprendedorA puede asignar guía a su propio pedido → 200")
    void emprendedorA_canAsignarGuia_ownPedido() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedidoA.getId() + "/guia")
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"numeroGuia\":\"CR123456789CR\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-SEC-019: EmprendedorA puede togglear carrusel de su propio producto ─
    @Test
    @DisplayName("T-SEC-019 | CRÍTICO — EmprendedorA puede togglear carrusel de su propio producto → 200")
    void emprendedorA_canToggleCarrusel_ownProducto() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoA.getId() + "/carrusel")
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enCarrusel\":true,\"orden\":1}"))
            .andExpect(status().isOk());
    }

    // ── T-SEC-020: EmprendedorA puede destacar su propio producto ────────────
    @Test
    @DisplayName("T-SEC-020 | CRÍTICO — EmprendedorA puede destacar su propio producto → 200")
    void emprendedorA_canToggleDestacado_ownProducto() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoA.getId() + "/destacado")
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"destacado\":true}"))
            .andExpect(status().isOk());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Empresa crearEmpresa(String nombre, String slug, String correo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario crearEmprendedor(String correo, String nombre, Rol rol, Empresa empresa) {
        Usuario u = crearUsuario(correo, nombre, rol);
        u.setEmpresa(empresa);
        return usuarioRepository.saveAndFlush(u);
    }

    private Categoria obtenerOCrearCategoria() {
        return categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Cat-Test");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
    }

    private Bodega crearBodega(String nombre, Usuario admin, Empresa empresa) {
        Bodega b = new Bodega();
        b.setNombreBodega(nombre);
        b.setDireccionExacta("Calle Test 1");
        b.setTelefono("88880000");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(admin);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Producto crearProducto(String nombre, String sku, Empresa empresa) {
        Producto p = new Producto();
        p.setNombreProducto(nombre);
        p.setSku(sku);
        p.setPrecioVenta(10000);
        p.setPrecioCompra(7000);
        p.setStockActual(10);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(bodegaA);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }

    private Pedido crearPedido(String numero, Usuario cliente, Bodega bodega, Empresa empresa) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setUsuarioFinal(cliente);
        p.setBodega(bodega);
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
        p.setItems(new ArrayList<>());
        return pedidoRepository.saveAndFlush(p);
    }
}
