package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * NIVEL: CRÍTICO — invariante legal del marketplace
 *
 * Los productos de TODAS las empresas aprobadas deben aparecer en el catálogo
 * público (/api/productos). Ocultar productos de un emprendedor pagante es un
 * incumplimiento contractual (incidente 2026-07-12: aprobar una empresa no
 * restauraba visibilidad_publica y su catálogo entero desaparecía de la web).
 *
 * Si un cambio tuyo hace fallar estos tests, NO los "arregles" tocando el
 * test: estás repitiendo el incidente. Ver skill visibilidad-catalogo-marketplace.
 */
@DisplayName("[CRÍTICO] Visibilidad del catálogo marketplace (CatalogoMarketplace)")
class CatalogoMarketplaceTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private SolicitudAprobacionRepository solicitudAprobacionRepository;
    @Autowired private org.springframework.cache.CacheManager cacheManager;

    private Categoria categoria;

    @BeforeEach
    void setUp() {
        // CacheConfig registra Caffeine como bean propio (spring.cache.type=none no
        // lo apaga): sin este clear, una página cacheada del catálogo de un test
        // anterior contamina los asserts de contenido.
        var cache = cacheManager.getCache("productos-publicos");
        if (cache != null) cache.clear();
        categoria = obtenerOCrearCategoria();
    }

    @AfterEach
    void tearDown() {
        solicitudAprobacionRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── T-MKT-001: el invariante — productos de TODAS las empresas aprobadas ──
    @Test
    @DisplayName("T-MKT-001 | CRÍTICO — Catálogo público contiene productos de TODAS las empresas aprobadas")
    void catalogoPublico_incluyeTodasLasEmpresasAprobadas() throws Exception {
        Empresa a = crearEmpresa("Marketplace A", "mkt-a", "mkt-a@test.cr", "ACTIVO", true);
        Empresa b = crearEmpresa("Marketplace B", "mkt-b", "mkt-b@test.cr", "ACTIVO", true);
        crearProducto("Prod Empresa A", "SKU-MKT-A1", a, true);
        crearProducto("Prod Empresa B", "SKU-MKT-B1", b, true);

        mockMvc.perform(get("/api/productos?size=50"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[?(@.nombreProducto == 'Prod Empresa A')]").exists())
            .andExpect(jsonPath("$.data.content[?(@.nombreProducto == 'Prod Empresa B')]").exists());
    }

    // ── T-MKT-002: el negativo legítimo — empresa pendiente no aparece ────────
    @Test
    @DisplayName("T-MKT-002 | CRÍTICO — Productos de empresa PENDIENTE_APROBACION no aparecen en el catálogo")
    void catalogoPublico_excluyeEmpresaPendiente() throws Exception {
        Empresa pendiente = crearEmpresa("Pendiente X", "mkt-pend", "mkt-pend@test.cr",
            "PENDIENTE_APROBACION", false);
        crearProducto("Prod Pendiente", "SKU-MKT-P1", pendiente, false);

        mockMvc.perform(get("/api/productos?size=50"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[?(@.nombreProducto == 'Prod Pendiente')]").doesNotExist());
    }

    // ── T-MKT-003: la regresión directa del incidente 2026-07-12 ──────────────
    @Test
    @DisplayName("T-MKT-003 | CRÍTICO — Aprobar empresa restaura visibilidad Y publica sus productos")
    void aprobarEmpresa_publicaSuCatalogo() throws Exception {
        Empresa pendiente = crearEmpresa("Nueva Tienda", "mkt-nueva", "mkt-nueva@test.cr",
            "PENDIENTE_APROBACION", false);
        Producto oculto = crearProducto("Prod Recien Aprobado", "SKU-MKT-N1", pendiente, false);

        mockMvc.perform(put("/api/admin/solicitudes-aprobacion/" + pendiente.getId() + "/aprobar")
                .header("Authorization", adminToken))
            .andExpect(status().isOk());

        Empresa releida = empresaRepository.findById(pendiente.getId()).orElseThrow();
        assertEquals("ACTIVO", releida.getEstadoEmpresa());
        assertTrue(Boolean.TRUE.equals(releida.getVisibilidadPublica()),
            "Aprobar la empresa debe restaurar visibilidad_publica=true (bug 2026-07-12)");
        assertTrue(Boolean.TRUE.equals(
                productoRepository.findById(oculto.getId()).orElseThrow().getVisibleCatalogo()),
            "Aprobar la empresa debe publicar sus productos activos");

        mockMvc.perform(get("/api/productos?size=50"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[?(@.nombreProducto == 'Prod Recien Aprobado')]").exists());
    }

    // ── T-MKT-004: la ruta alterna de activación hace lo mismo ────────────────
    @Test
    @DisplayName("T-MKT-004 | CRÍTICO — PUT /api/admin/empresas/{id}/estado ACTIVO también publica el catálogo")
    void cambiarEstadoActivo_publicaSuCatalogo() throws Exception {
        Empresa pendiente = crearEmpresa("Tienda Estado", "mkt-estado", "mkt-estado@test.cr",
            "PENDIENTE_APROBACION", false);
        Producto oculto = crearProducto("Prod Via Estado", "SKU-MKT-E1", pendiente, false);

        mockMvc.perform(put("/api/admin/empresas/" + pendiente.getId() + "/estado")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estadoEmpresa\":\"ACTIVO\"}"))
            .andExpect(status().isOk());

        Empresa releida = empresaRepository.findById(pendiente.getId()).orElseThrow();
        assertTrue(Boolean.TRUE.equals(releida.getVisibilidadPublica()));
        assertTrue(Boolean.TRUE.equals(
            productoRepository.findById(oculto.getId()).orElseThrow().getVisibleCatalogo()));
    }

    // ── T-MKT-005: producto nuevo de empresa ya aprobada nace publicado ───────
    @Test
    @DisplayName("T-MKT-005 | CRÍTICO — Producto nuevo de empresa aprobada nace visible, sin aprobación por producto")
    void productoNuevoDeEmpresaAprobada_naceVisible() throws Exception {
        Empresa aprobada = crearEmpresa("Aprobada Alta", "mkt-alta", "mkt-alta@test.cr", "ACTIVO", true);
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario emprendedor = crearUsuario("mkt-emp@test.cr", "Emp Mkt", rolEmp);
        emprendedor.setEmpresa(aprobada);
        usuarioRepository.saveAndFlush(emprendedor);
        String tokenEmp = tokenPara(emprendedor, Constants.ROL_EMPRENDEDOR);
        Bodega bodega = crearBodega("Bodega Mkt", aprobada);

        String body = String.format(
            "{\"nombreProducto\":\"Prod Alta Directa\",\"sku\":\"SKU-MKT-D1\"," +
            "\"precioVenta\":12000,\"precioCompra\":8000,\"stockActual\":3," +
            "\"stockMinimo\":1,\"categoriaId\":%d,\"bodegaId\":%d}",
            categoria.getId(), bodega.getId());

        mockMvc.perform(post("/api/productos")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Producto creado"))
            .andExpect(jsonPath("$.data.visibleCatalogo").value(true));

        mockMvc.perform(get("/api/productos?size=50"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[?(@.nombreProducto == 'Prod Alta Directa')]").exists());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Empresa crearEmpresa(String nombre, String slug, String correo,
                                 String estadoEmpresa, boolean visible) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa(estadoEmpresa);
        e.setVisibilidadPublica(visible);
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Producto crearProducto(String nombre, String sku, Empresa empresa, boolean visibleCatalogo) {
        Producto p = new Producto();
        p.setNombreProducto(nombre);
        p.setSku(sku);
        p.setPrecioVenta(10000);
        p.setPrecioCompra(6000);
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(visibleCatalogo);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(crearBodega("Bodega " + sku, empresa));
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

    private Categoria obtenerOCrearCategoria() {
        return categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Test-Cat-Mkt");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
    }
}
