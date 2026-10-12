package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Barra del header: hasta 3 categorías raíz, por visitas de 30 días con fallback a productos públicos. */
@DisplayName("Categorías top del header (visitas agregadas + fallback)")
class CategoriasTopTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaVisitaDiaRepository visitaRepository;
    @Autowired private CacheManager cacheManager;

    private Categoria a, b, b1, c, d, e;
    private Empresa visible, oculta;
    private int sku;

    @BeforeEach
    void setUp() {
        limpiarCache();
        visible = crearEmpresa("Top Visible", "top-vis", "ACTIVO", true);
        oculta = crearEmpresa("Top Oculta", "top-ocu", "ACTIVO", false);
        a = crearCategoria("Alfa", null);
        b = crearCategoria("Beta", null);
        b1 = crearCategoria("Beta hija", b);
        c = crearCategoria("Gama", null);
        d = crearCategoria("Delta solo oculta", null);
        e = crearCategoria("Epsilon sin productos", null);
        for (int i = 0; i < 3; i++) crearProducto(a, visible);
        crearProducto(b, visible);
        crearProducto(b1, visible);
        crearProducto(c, visible);
        crearProducto(c, visible);
        crearProducto(d, oculta);
    }

    @AfterEach
    void tearDown() {
        visitaRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.findAll().stream().filter(x -> x.getCategoriaPadre() != null).forEach(categoriaRepository::delete);
        categoriaRepository.deleteAll();
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
        limpiarCache();
    }

    @Test
    @DisplayName("Sin visitas: raíces con más productos públicos (la hija suma a su raíz); sin ocultas ni vacías")
    void sinVisitas_fallbackPorProductos() throws Exception {
        mockMvc.perform(get("/api/categorias/publicas/top"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(3)))
            .andExpect(jsonPath("$.data[0].nombre").value("Alfa"))
            .andExpect(jsonPath("$.data[1].nombre").value("Beta"))
            .andExpect(jsonPath("$.data[1].productos").value(2))
            .andExpect(jsonPath("$.data[2].nombre").value("Gama"));
    }

    @Test
    @DisplayName("Con visitas: orden descendente por visitas de 30 días, contadas en la raíz, sin PII")
    void conVisitas_ordenPorVisitas() throws Exception {
        for (int i = 0; i < 3; i++) visitar(b1.getId());
        visitar(c.getId());
        for (int i = 0; i < 5; i++) { visitar(d.getId()); visitar(e.getId()); }
        visitar(999_999L);
        LocalDate hoy = LocalDate.now(ZoneId.of("America/Costa_Rica"));
        visitaRepository.save(new CategoriaVisitaDia(a.getId(), hoy.minusDays(30), 100));

        mockMvc.perform(get("/api/categorias/publicas/top"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(3)))
            .andExpect(jsonPath("$.data[0].nombre").value("Beta"))
            .andExpect(jsonPath("$.data[0].visitas").value(3))
            .andExpect(jsonPath("$.data[1].nombre").value("Gama"))
            .andExpect(jsonPath("$.data[2].nombre").value("Alfa"))
            .andExpect(jsonPath("$.data[2].visitas").value(0));

        assertEquals(3, visitaRepository.findAll().stream()
            .filter(v -> v.getCategoriaId().equals(b.getId())).mapToInt(CategoriaVisitaDia::getVisitas).sum());
        assertEquals(0, visitaRepository.findAll().stream().filter(v -> v.getCategoriaId().equals(b1.getId())).count());
    }

    @Test
    @DisplayName("El endpoint público queda en caché (300 s)")
    void top_cacheado() throws Exception {
        mockMvc.perform(get("/api/categorias/publicas/top")).andExpect(jsonPath("$.data[0].nombre").value("Alfa"));
        for (int i = 0; i < 4; i++) visitar(c.getId());
        mockMvc.perform(get("/api/categorias/publicas/top")).andExpect(jsonPath("$.data[0].nombre").value("Alfa"));
        limpiarCache();
        mockMvc.perform(get("/api/categorias/publicas/top")).andExpect(jsonPath("$.data[0].nombre").value("Gama"));
    }

    private void visitar(Long id) throws Exception {
        mockMvc.perform(post("/api/public/categorias/" + id + "/visita")).andExpect(status().isNoContent());
    }

    private void limpiarCache() {
        for (String n : new String[] {"categorias-publicas", "productos-publicos"}) {
            var cache = cacheManager.getCache(n);
            if (cache != null) cache.clear();
        }
    }

    private Empresa crearEmpresa(String nombre, String slug, String estado, boolean visiblePublica) {
        Empresa x = new Empresa();
        x.setNombreEmpresa(nombre);
        x.setSlug(slug);
        x.setCorreoEmpresa(slug + "@test.cr");
        x.setEstadoEmpresa(estado);
        x.setVisibilidadPublica(visiblePublica);
        x.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(x);
    }

    private Categoria crearCategoria(String nombre, Categoria padre) {
        Categoria x = new Categoria();
        x.setNombreCategoria(nombre);
        x.setEstado(Constants.ESTADO_ACTIVO);
        x.setAdminCliente(adminUser);
        x.setCategoriaPadre(padre);
        return categoriaRepository.saveAndFlush(x);
    }

    private void crearProducto(Categoria categoria, Empresa empresa) {
        sku++;
        Bodega bo = new Bodega();
        bo.setNombreBodega("Bodega top " + sku);
        bo.setDireccionExacta("Calle Test 1");
        bo.setTelefono("88880000");
        bo.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bo.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bo.setAdminCliente(adminUser);
        bo.setEmpresa(empresa);
        bo.setEstado(Constants.ESTADO_ACTIVO);
        bodegaRepository.saveAndFlush(bo);
        Producto p = new Producto();
        p.setNombreProducto("Prod top " + sku);
        p.setSku("SKU-TOP-" + sku);
        p.setPrecioVenta(10000);
        p.setPrecioCompra(6000);
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(bo);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        productoRepository.saveAndFlush(p);
    }
}
