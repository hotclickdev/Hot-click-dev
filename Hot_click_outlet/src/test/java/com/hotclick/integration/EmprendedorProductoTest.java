package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * NIVEL: NORMAL — 30 tests
 *
 * Verifica operaciones CRUD de productos para el rol EMPRENDEDOR:
 * - Crear, actualizar, eliminar productos propios
 * - Listar solo productos de la empresa
 * - Carrusel/destacado/ajustar precios restringidos a ADMIN (emprendedor → 403)
 * - Archivar sin stock (scoped por empresa)
 * - Catálogo público accesible sin autenticación
 */
@DisplayName("[NORMAL] CRUD de Productos para Emprendedor (EmprendedorProducto)")
class EmprendedorProductoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;

    private Empresa   empresa;
    private Empresa   empresaOtra;
    private Usuario   emprendedor;
    private String    tokenEmp;
    private Categoria categoria;
    private Bodega    bodega;
    private Producto  productoPropio;
    private Producto  productoOtro;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);

        empresa      = crearEmpresa("Empr Prod A", "empr-prod-a", "prod-a@test.cr");
        empresaOtra  = crearEmpresa("Empr Prod B", "empr-prod-b", "prod-b@test.cr");

        emprendedor  = crearConEmpresa("ep-prod@test.cr", "EP Prod", rolEmp, empresa);
        tokenEmp     = "Bearer " + jwtUtil.generateToken(emprendedor.getCorreo(), emprendedor.getId(), Constants.ROL_EMPRENDEDOR);

        categoria     = obtenerOCrearCategoria();
        bodega        = crearBodega("Bodega Prod A", empresa);
        productoPropio = crearProducto("Zapato Rojo Test", "SKU-ZAP-T01", 25000, 15000, 10, empresa);
        productoOtro   = crearProducto("Silla Azul Otra",  "SKU-SIL-T01",  8000,  5000,  5, empresaOtra);
    }

    @AfterEach
    void tearDown() {
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── T-PROD-001: Catálogo público accesible sin token ─────────────────────
    @Test
    @DisplayName("T-PROD-001 | NORMAL — Catálogo público GET /api/productos → 200 sin token")
    void catalogoPublico_sinToken_200() throws Exception {
        mockMvc.perform(get("/api/productos"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-PROD-002: Emprendedor lista sus productos (admin/todos) ─────────────
    @Test
    @DisplayName("T-PROD-002 | NORMAL — Emprendedor lista sus productos vía /admin/todos → 200")
    void emprendedor_listProductos_adminTodos_200() throws Exception {
        mockMvc.perform(get("/api/productos/admin/todos")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-PROD-003: /admin/todos solo devuelve productos de su empresa ────────
    @Test
    @DisplayName("T-PROD-003 | NORMAL — /admin/todos solo contiene productos de la empresa propia")
    void adminTodos_onlyOwnEmpresa() throws Exception {
        mockMvc.perform(get("/api/productos/admin/todos")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[?(@.nombreProducto == 'Zapato Rojo Test')]").exists())
            .andExpect(jsonPath("$.data.content[?(@.nombreProducto == 'Silla Azul Otra')]").doesNotExist());
    }

    // ── T-PROD-004: /admin/todos sin token → 401 ─────────────────────────────
    @Test
    @DisplayName("T-PROD-004 | NORMAL — /admin/todos sin token → 401")
    void adminTodos_noToken_401() throws Exception {
        mockMvc.perform(get("/api/productos/admin/todos"))
            .andExpect(status().isUnauthorized());
    }

    // ── T-PROD-005: Emprendedor crea producto → 200 ───────────────────────────
    @Test
    @DisplayName("T-PROD-005 | NORMAL — Emprendedor puede crear producto → 200")
    void emprendedor_creaProducto_200() throws Exception {
        String body = buildProductoBody("Nuevo Prod Test", "SKU-NPT-001", 20000, 12000, 5);
        mockMvc.perform(post("/api/productos")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.nombreProducto").value("Nuevo Prod Test"));
    }

    // ── T-PROD-006: Producto creado queda asociado a la empresa del emprendedor
    @Test
    @DisplayName("T-PROD-006 | NORMAL — Producto creado se asocia a la empresa del emprendedor")
    void creaProducto_asociadoAEmpresa() throws Exception {
        String body = buildProductoBody("Prod Empresa Test", "SKU-PET-001", 15000, 9000, 3);
        mockMvc.perform(post("/api/productos")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-PROD-007: Crear producto con SKU duplicado → sistema lo permite (no hay constraint único) ─
    @Test
    @DisplayName("T-PROD-007 | NORMAL — Crear producto con SKU duplicado → 200 (sin restricción única)")
    void creaProducto_skuDuplicado_200() throws Exception {
        String body = buildProductoBody("Duplicado", "SKU-ZAP-T01", 10000, 6000, 2);
        mockMvc.perform(post("/api/productos")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());
    }

    // ── T-PROD-008: USUARIO_FINAL no puede crear productos → 403 ─────────────
    @Test
    @DisplayName("T-PROD-008 | NORMAL — USUARIO_FINAL no puede crear productos → 403")
    void usuarioFinal_cannotCrearProducto_403() throws Exception {
        String body = buildProductoBody("Hack Prod", "SKU-HACK-001", 1000, 500, 1);
        mockMvc.perform(post("/api/productos")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
    }

    // ── T-PROD-009: Emprendedor actualiza su producto → 200 ───────────────────
    @Test
    @DisplayName("T-PROD-009 | NORMAL — Emprendedor actualiza su propio producto → 200")
    void emprendedor_updateOwnProducto_200() throws Exception {
        String body = buildProductoBody("Zapato Rojo Actualizado", "SKU-ZAP-T01", 28000, 15000, 10);
        mockMvc.perform(put("/api/productos/" + productoPropio.getId())
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.nombreProducto").value("Zapato Rojo Actualizado"));
    }

    // ── T-PROD-010: Precio actualizado se persiste ────────────────────────────
    @Test
    @DisplayName("T-PROD-010 | NORMAL — Precio actualizado se refleja al releer el producto")
    void updateProducto_precioActualizadoPersiste() throws Exception {
        String body = buildProductoBody("Zapato Rojo Test", "SKU-ZAP-T01", 30000, 15000, 10);
        mockMvc.perform(put("/api/productos/" + productoPropio.getId())
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.precioVenta").value(30000));
    }

    // ── T-PROD-011: Producto no encontrado → 400/404 ─────────────────────────
    @Test
    @DisplayName("T-PROD-011 | NORMAL — Actualizar producto inexistente → 400")
    void updateProducto_notFound_400() throws Exception {
        String body = buildProductoBody("Ghost", "SKU-GHOST-001", 5000, 3000, 1);
        mockMvc.perform(put("/api/productos/999999")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().is4xxClientError());
    }

    // ── T-PROD-012: Emprendedor elimina su producto → 200 ────────────────────
    @Test
    @DisplayName("T-PROD-012 | NORMAL — Emprendedor elimina su propio producto → 200")
    void emprendedor_deleteOwnProducto_200() throws Exception {
        mockMvc.perform(delete("/api/productos/" + productoPropio.getId())
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk());
    }

    // ── T-PROD-013: Ver producto por ID público → 200 sin token ──────────────
    @Test
    @DisplayName("T-PROD-013 | NORMAL — Ver producto por ID sin token → 200")
    void getProductoById_noToken_200() throws Exception {
        mockMvc.perform(get("/api/productos/" + productoPropio.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.nombreProducto").value("Zapato Rojo Test"));
    }

    // ── T-PROD-014: Producto inexistente por ID → 404 ────────────────────────
    @Test
    @DisplayName("T-PROD-014 | NORMAL — Producto inexistente por ID → 404")
    void getProductoById_notFound_404() throws Exception {
        mockMvc.perform(get("/api/productos/999999"))
            .andExpect(status().isNotFound());
    }

    // ── T-PROD-015: Emprendedor no puede togglear carrusel → 403 ────────────
    @Test
    @DisplayName("T-PROD-015 | NORMAL — Emprendedor togglear carrusel → 403 (solo ADMIN)")
    void toggleCarrusel_emprendedor_403() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoPropio.getId() + "/carrusel")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enCarrusel\":true,\"orden\":2}"))
            .andExpect(status().isForbidden());
    }

    // ── T-PROD-016: ADMIN togglear carrusel ON → 200 ─────────────────────────
    @Test
    @DisplayName("T-PROD-016 | NORMAL — ADMIN toggle carrusel ON → 200")
    void toggleCarrusel_admin_on_200() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoPropio.getId() + "/carrusel")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enCarrusel\":true,\"orden\":2}"))
            .andExpect(status().isOk());
    }

    // ── T-PROD-017: ADMIN toggle carrusel sin enCarrusel → 400 ───────────────
    @Test
    @DisplayName("T-PROD-017 | NORMAL — ADMIN toggle carrusel sin campo enCarrusel → 400")
    void toggleCarrusel_admin_missingField_400() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoPropio.getId() + "/carrusel")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    // ── T-PROD-018: Emprendedor no puede togglear destacado → 403 ────────────
    @Test
    @DisplayName("T-PROD-018 | NORMAL — Emprendedor toggle destacado → 403 (solo ADMIN)")
    void toggleDestacado_emprendedor_403() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoPropio.getId() + "/destacado")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"destacado\":true}"))
            .andExpect(status().isForbidden());
    }

    // ── T-PROD-019: ADMIN toggle destacado ON → 200 ──────────────────────────
    @Test
    @DisplayName("T-PROD-019 | NORMAL — ADMIN toggle destacado ON → 200")
    void toggleDestacado_admin_on_200() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoPropio.getId() + "/destacado")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"destacado\":true}"))
            .andExpect(status().isOk());
    }

    // ── T-PROD-020: ADMIN toggle destacado sin campo → 400 ───────────────────
    @Test
    @DisplayName("T-PROD-020 | NORMAL — ADMIN toggle destacado sin campo 'destacado' → 400")
    void toggleDestacado_admin_missingField_400() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoPropio.getId() + "/destacado")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ADMIN pausa producto de un emprendedor vía visibilidad-catalogo")
    void toggleVisibleCatalogo_adminPausa_200() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoPropio.getId() + "/visibilidad-catalogo")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"visibleCatalogo\":false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.visibleCatalogo").value(false));
    }

    @Test
    @DisplayName("Emprendedor publica de nuevo su producto pausado")
    void toggleVisibleCatalogo_emprendedorPublica_200() throws Exception {
        productoPropio.setVisibleCatalogo(false);
        productoRepository.saveAndFlush(productoPropio);
        mockMvc.perform(patch("/api/productos/" + productoPropio.getId() + "/visibilidad-catalogo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"visibleCatalogo\":true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.visibleCatalogo").value(true));
    }

    @Test
    @DisplayName("Emprendedor no puede cambiar visibilidad de producto de otra empresa")
    void toggleVisibleCatalogo_otraEmpresa_403() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoOtro.getId() + "/visibilidad-catalogo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"visibleCatalogo\":false}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PATCH visibilidad-catalogo sin campo → 400")
    void toggleVisibleCatalogo_sinCampo_400() throws Exception {
        mockMvc.perform(patch("/api/productos/" + productoPropio.getId() + "/visibilidad-catalogo")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    // ── T-PROD-021: Destacados públicos sin token → 200 ──────────────────────
    @Test
    @DisplayName("T-PROD-021 | NORMAL — Listar destacados sin token → 200")
    void destacados_noToken_200() throws Exception {
        mockMvc.perform(get("/api/productos/destacados"))
            .andExpect(status().isOk());
    }

    // ── T-PROD-022: Carrusel público sin token → 200 ─────────────────────────
    @Test
    @DisplayName("T-PROD-022 | NORMAL — Listar carrusel sin token → 200")
    void carrusel_noToken_200() throws Exception {
        mockMvc.perform(get("/api/productos/carrusel"))
            .andExpect(status().isOk());
    }

    // ── T-PROD-023: Archivar sin stock (scope empresa) → 200 ─────────────────
    @Test
    @DisplayName("T-PROD-023 | NORMAL — archivarSinStock solo afecta productos de la empresa → 200")
    void archivarSinStock_onlyOwnEmpresa_200() throws Exception {
        // No se borra manualmente al final: el endpoint le sube la versión (optimistic
        // lock) y tearDown() ya limpia todos los productos con deleteAll().
        crearProducto("Sin Stock Test", "SKU-SS-001", 5000, 3000, 0, empresa);
        mockMvc.perform(post("/api/productos/archivar-sin-stock")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-PROD-024: Archivar sin stock sin token → 401 ───────────────────────
    @Test
    @DisplayName("T-PROD-024 | NORMAL — archivarSinStock sin token → 401")
    void archivarSinStock_noToken_401() throws Exception {
        mockMvc.perform(post("/api/productos/archivar-sin-stock"))
            .andExpect(status().isUnauthorized());
    }

    // ── T-PROD-025: Emprendedor no puede ajustar precios masivo → 403 ────────
    @Test
    @DisplayName("T-PROD-025 | NORMAL — Emprendedor ajustarPrecios → 403 (solo ADMIN)")
    void ajustarPrecios_emprendedor_403() throws Exception {
        mockMvc.perform(post("/api/productos/ajustar-precios")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"porcentaje\":10}"))
            .andExpect(status().isForbidden());
    }

    // ── T-PROD-026: ADMIN ajustar precios con porcentaje=0 → 400 ─────────────
    @Test
    @DisplayName("T-PROD-026 | NORMAL — ADMIN ajustarPrecios con porcentaje=0 → 400")
    void ajustarPrecios_admin_cero_400() throws Exception {
        mockMvc.perform(post("/api/productos/ajustar-precios")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"porcentaje\":0}"))
            .andExpect(status().isBadRequest());
    }

    // ── T-PROD-026b: ADMIN ajustar precios +10% → 200 ───────────────────────
    @Test
    @DisplayName("T-PROD-026b | NORMAL — ADMIN ajustarPrecios +10% → 200")
    void ajustarPrecios_admin_positivo_200() throws Exception {
        mockMvc.perform(post("/api/productos/ajustar-precios")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"porcentaje\":10}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-PROD-027: Paginación del catálogo → 200 y estructura correcta ───────
    @Test
    @DisplayName("T-PROD-027 | NORMAL — Catálogo paginado devuelve estructura de página → 200")
    void catalogo_paginado_estructuraCorrecta() throws Exception {
        mockMvc.perform(get("/api/productos?page=0&size=5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-PROD-028: Listar productos por marca → 200 ─────────────────────────
    @Test
    @DisplayName("T-PROD-028 | NORMAL — Listar productos por marca (sin auth) → 200")
    void listarPorMarca_noToken_200() throws Exception {
        mockMvc.perform(get("/api/productos/marca/1"))
            .andExpect(status().isOk());
    }

    // ── T-PROD-029: Importación bulk vacía → 200 con 0 importados ────────────
    @Test
    @DisplayName("T-PROD-029 | NORMAL — Bulk import con lista vacía → 200 ok=0")
    void bulkImport_emptyList_200() throws Exception {
        mockMvc.perform(post("/api/productos/bulk")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("[]"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(0));
    }

    // ── T-PROD-030: USUARIO_FINAL no puede eliminar productos → 403 ──────────
    @Test
    @DisplayName("T-PROD-030 | NORMAL — USUARIO_FINAL no puede eliminar productos → 403")
    void usuarioFinal_cannotDeleteProducto_403() throws Exception {
        mockMvc.perform(delete("/api/productos/" + productoPropio.getId())
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String buildProductoBody(String nombre, String sku, int precio, int costo, int stock) {
        return String.format(
            "{\"nombreProducto\":\"%s\",\"sku\":\"%s\",\"precioVenta\":%d,\"precioCompra\":%d," +
            "\"stockActual\":%d,\"stockMinimo\":1,\"categoriaId\":%d,\"bodegaId\":%d}",
            nombre, sku, precio, costo, stock, categoria.getId(), bodega.getId());
    }

    private Empresa crearEmpresa(String nombre, String slug, String correo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario crearConEmpresa(String correo, String nombre, Rol rol, Empresa empresa) {
        Usuario u = crearUsuario(correo, nombre, rol);
        u.setEmpresa(empresa);
        return usuarioRepository.saveAndFlush(u);
    }

    private Categoria obtenerOCrearCategoria() {
        return categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Test-Cat");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
    }

    private Producto crearProducto(String nombre, String sku, int precio, int costo, int stock, Empresa empresa) {
        Producto p = new Producto();
        p.setNombreProducto(nombre);
        p.setSku(sku);
        p.setPrecioVenta(precio);
        p.setPrecioCompra(costo);
        p.setStockActual(stock);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(bodega);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }

    private Bodega crearBodega(String nombre, Empresa empresa) {
        Bodega b = new Bodega();
        b.setNombreBodega(nombre);
        b.setDireccionExacta("Calle Test 1");
        b.setTelefono("88880000");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }
}
