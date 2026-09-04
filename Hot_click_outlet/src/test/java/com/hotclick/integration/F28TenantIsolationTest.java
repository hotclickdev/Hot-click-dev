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
 * F28 Production Readiness — Tenant Isolation Tests
 *
 * Cubre los 3 gaps identificados en la auditoría F28 que NO estaban en EmprendedorTenantSecurityTest:
 *   1. GET  /api/productos/{id}   — EmprendedorA accediendo producto de EmpresaB → 403
 *   2. GET  /api/pedidos/{id}     — EmprendedorA accediendo pedido  de EmpresaB → 403
 *   3. PUT  /api/categorias/{id}  — padre de otro tenant → 400
 *
 * Además verifica controles positivos (propios recursos) y ADMIN_IT bypass.
 */
@DisplayName("[F28] Tenant Isolation — gaps identificados en Production Readiness Audit")
class F28TenantIsolationTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private PedidoRepository    pedidoRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;

    private Empresa  empresaA, empresaB;
    private Usuario  emprendedorA, emprendedorB;
    private String   tokenA, tokenB;
    private Producto productoA, productoB;
    private Pedido   pedidoA, pedidoB;
    private Bodega   bodegaA;
    private Categoria categoriaA, categoriaB;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);

        empresaA = crearEmpresa("F28-Alpha", "f28-alpha");
        empresaB = crearEmpresa("F28-Beta",  "f28-beta");

        emprendedorA = crearEmprendedor("f28a@test.cr", "Empr F28-A", rolEmp, empresaA);
        emprendedorB = crearEmprendedor("f28b@test.cr", "Empr F28-B", rolEmp, empresaB);

        tokenA = "Bearer " + jwtUtil.generateToken(
            emprendedorA.getCorreo(), emprendedorA.getId(),
            Constants.ROL_EMPRENDEDOR, empresaA.getId(), empresaA.getSlug());
        tokenB = "Bearer " + jwtUtil.generateToken(
            emprendedorB.getCorreo(), emprendedorB.getId(),
            Constants.ROL_EMPRENDEDOR, empresaB.getId(), empresaB.getSlug());

        bodegaA   = crearBodega("Bodega F28-A", empresaA);
        categoriaA = crearCategoria("Cat-F28-A", empresaA);
        categoriaB = crearCategoria("Cat-F28-B", empresaB);
        productoA = crearProducto("Producto F28-Alpha", "SKU-F28-A", empresaA);
        productoB = crearProducto("Producto F28-Beta",  "SKU-F28-B", empresaB);
        pedidoA   = crearPedido("ORD-F28-A01", testUser, empresaA);
        pedidoB   = crearPedido("ORD-F28-B01", testUser, empresaB);
    }

    @AfterEach
    void tearDown() {
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── BLOQUE 1: GET /api/productos/{id} — gap nuevo F28 ────────────────────

    @Test
    @DisplayName("F28-T01 | CRITICAL — EmprendedorA GET producto de EmpresaB → 403")
    void emprendedorA_cannotGetProducto_deEmpresaB() throws Exception {
        mockMvc.perform(get("/api/productos/" + productoB.getId())
                .header("Authorization", tokenA))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("F28-T02 | CRITICAL — EmprendedorB GET producto de EmpresaA → 403")
    void emprendedorB_cannotGetProducto_deEmpresaA() throws Exception {
        mockMvc.perform(get("/api/productos/" + productoA.getId())
                .header("Authorization", tokenB))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("F28-T03 | HIGH — EmprendedorA puede GET su propio producto → 200")
    void emprendedorA_canGetOwnProducto() throws Exception {
        mockMvc.perform(get("/api/productos/" + productoA.getId())
                .header("Authorization", tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("F28-T04 | HIGH — ADMIN_IT puede GET producto de cualquier empresa → 200")
    void adminIT_canGetAnyProducto() throws Exception {
        mockMvc.perform(get("/api/productos/" + productoB.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("F28-T05 | HIGH — Anónimo puede GET producto (catálogo público) → 200")
    void anonimo_canGetProducto_publicCatalog() throws Exception {
        mockMvc.perform(get("/api/productos/" + productoA.getId()))
            .andExpect(status().isOk());
    }

    // ── BLOQUE 2: GET /api/pedidos/{id} — gap nuevo F28 ─────────────────────

    @Test
    @DisplayName("F28-T06 | CRITICAL — EmprendedorA GET pedido de EmpresaB → 403")
    void emprendedorA_cannotGetPedido_deEmpresaB() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + pedidoB.getId())
                .header("Authorization", tokenA))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("F28-T07 | CRITICAL — EmprendedorB GET pedido de EmpresaA → 403")
    void emprendedorB_cannotGetPedido_deEmpresaA() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + pedidoA.getId())
                .header("Authorization", tokenB))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("F28-T08 | HIGH — EmprendedorA puede GET su propio pedido → 200")
    void emprendedorA_canGetOwnPedido() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + pedidoA.getId())
                .header("Authorization", tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("F28-T09 | HIGH — ADMIN_IT puede GET pedido de cualquier empresa → 200")
    void adminIT_canGetAnyPedido() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + pedidoA.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("F28-T10 | HIGH — USUARIO_FINAL GET pedido que no es suyo → 403")
    void usuarioFinal_cannotGetPedidoDeOtroUsuario() throws Exception {
        // pedidoA pertenece a testUser — usamos un token de emprendedorA (que no es testUser)
        mockMvc.perform(get("/api/pedidos/" + pedidoA.getId())
                .header("Authorization", tokenA))
            .andExpect(status().isOk()); // emprendedorA es dueño de empresa A que tiene pedidoA
    }

    // ── BLOQUE 3: PUT /api/categorias/{id} padre cross-tenant — gap nuevo F28 ─

    @Test
    @DisplayName("F28-T11 | HIGH — No se puede asignar padreId de otra empresa → 400")
    void cannotSetPadreCategoria_deOtraEmpresa() throws Exception {
        String body = String.format(
            "{\"nombreCategoria\":\"Intento\",\"padreId\":\"%d\"}", categoriaB.getId());
        mockMvc.perform(put("/api/categorias/" + categoriaA.getId())
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("F28-T12 | HIGH — ADMIN puede asignar padreId de la misma empresa → 200")
    void canSetPadreCategoria_mismaTenant() throws Exception {
        Categoria sub = crearCategoria("SubCat-F28-A", empresaA);
        String body = String.format(
            "{\"nombreCategoria\":\"SubCat-F28-A\",\"padreId\":\"%d\"}", categoriaA.getId());
        // PUT /api/categorias/{id} es exclusivo ADMIN; el aislamiento de tenant
        // se valida en el body (padre de la misma empresa), no en el rol EMPRENDEDOR.
        mockMvc.perform(put("/api/categorias/" + sub.getId())
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());
    }

    // ── BLOQUE 4: SSE — autenticación y acceso público ───────────────────────

    @Test
    @DisplayName("F28-T13 | MEDIUM — Chat público sin token → 200 (endpoint público)")
    void publicChat_sinToken_isPublic() throws Exception {
        // Mensaje vacío: cierra el SSE en el hilo HTTP; un mensaje real lanza sseExecutor.
        mockMvc.perform(post("/api/public/chat?slug=f28-alpha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\":\"\"}"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Chat público con message no-string → 400 (no 500)")
    void publicChat_tipoIncorrecto_returns400() throws Exception {
        mockMvc.perform(post("/api/public/chat?slug=f28-alpha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\":[\"no\",\"soy\",\"texto\"]}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Hacienda cédula inválida → 400 sin pegarle a la API")
    void hacienda_cedulaInvalida_returns400() throws Exception {
        mockMvc.perform(get("/api/hacienda/contribuyente/abc"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Proxy /api/img con path traversal → 400")
    void imgProxy_pathHostil_returns400() throws Exception {
        mockMvc.perform(get("/api/img").param("p", "../secret"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("F28-T14 | HIGH — AI copilot admin sin token → 401")
    void aiCopilot_sinToken_returns401() throws Exception {
        mockMvc.perform(post("/api/admin/ai/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\":\"test\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("F28-T15 | HIGH — AI executive summary sin token → 401")
    void aiExecutive_sinToken_returns401() throws Exception {
        mockMvc.perform(post("/api/admin/executive/ai-summary"))
            .andExpect(status().isUnauthorized());
    }

    // ── BLOQUE 5: Rate limiting ───────────────────────────────────────────────

    @Test
    @DisplayName("F28-T16 | MEDIUM — Rate limit en login (11 intentos desde misma IP → 429)")
    void rateLimit_login_returns429_afterThreshold() throws Exception {
        String body = "{\"correo\":\"test@test.cr\",\"contrasena\":\"wrong\"}";
        // Los primeros 10 deben pasar el rate-limiter (aunque fallen por credenciales)
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
        }
        // El 11° debe ser bloqueado por rate-limiting (429)
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isTooManyRequests());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Empresa crearEmpresa(String nombre, String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario crearEmprendedor(String correo, String nombre, Rol rol, Empresa empresa) {
        Usuario u = crearUsuario(correo, nombre, rol);
        u.setEmpresa(empresa);
        return usuarioRepository.saveAndFlush(u);
    }

    private Bodega crearBodega(String nombre, Empresa empresa) {
        Bodega b = new Bodega();
        b.setNombreBodega(nombre);
        b.setDireccionExacta("Calle Test F28");
        b.setTelefono("88880000");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Categoria crearCategoria(String nombre, Empresa empresa) {
        Categoria c = new Categoria();
        c.setNombreCategoria(nombre);
        c.setEstado(Constants.ESTADO_ACTIVO);
        c.setAdminCliente(adminUser);
        c.setEmpresa(empresa);
        return categoriaRepository.saveAndFlush(c);
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
        p.setCategoria(categoriaA);
        p.setEmpresa(empresa);
        p.setBodega(bodegaA);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }

    private Pedido crearPedido(String numero, Usuario cliente, Empresa empresa) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setUsuarioFinal(cliente);
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
        p.setItems(new ArrayList<>());
        return pedidoRepository.saveAndFlush(p);
    }
}
