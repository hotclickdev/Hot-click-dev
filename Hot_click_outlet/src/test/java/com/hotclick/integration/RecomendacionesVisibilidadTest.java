package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * «También te puede gustar» de /productos/{id} (GET /api/productos/{id}/recomendaciones) usa la misma regla que
 * el catálogo público: en prod se colaban productos de negocios internos u ocultos («Caja») e inactivos («dannyt»).
 */
@DisplayName("Recomendaciones: sin negocios ocultos, internos ni inactivos")
class RecomendacionesVisibilidadTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private org.springframework.cache.CacheManager cacheManager;

    private Categoria categoria;

    @BeforeEach
    void setUp() {
        var cache = cacheManager.getCache("productos-publicos");
        if (cache != null) cache.clear();
        categoria = obtenerOCrearCategoria();
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

    @Test
    @DisplayName("Solo productos visibles de negocios activos y públicos; nunca el producto base")
    void recomendacionesRespetanCatalogoPublico() throws Exception {
        Empresa publica = crearEmpresa("Tienda Publica", "rec-publica", "rec-pub@test.cr", "ACTIVO", true);
        Empresa caja = crearEmpresa("Caja", "rec-caja", "rec-caja@test.cr", "ACTIVO", false);
        Empresa dannyt = crearEmpresa("dannyt", "rec-dannyt", "rec-dannyt@test.cr", "INACTIVO", true);

        Producto base = crearProducto("Base", "SKU-REC-0", publica, true);
        crearProducto("Visible OK", "SKU-REC-1", publica, true);
        crearProducto("De Caja", "SKU-REC-2", caja, true);
        crearProducto("De dannyt", "SKU-REC-3", dannyt, true);
        crearProducto("Oculto en catalogo", "SKU-REC-4", publica, false);
        Producto inactivo = crearProducto("Inactivo", "SKU-REC-5", publica, true);
        inactivo.setEstado(Constants.ESTADO_INACTIVO);
        productoRepository.saveAndFlush(inactivo);

        mockMvc.perform(get("/api/productos/" + base.getId() + "/recomendaciones?limit=10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.nombreProducto == 'Visible OK')]").exists())
            .andExpect(jsonPath("$.data[?(@.nombreProducto == 'Base')]").doesNotExist())
            .andExpect(jsonPath("$.data[?(@.nombreProducto == 'De Caja')]").doesNotExist())
            .andExpect(jsonPath("$.data[?(@.nombreProducto == 'De dannyt')]").doesNotExist())
            .andExpect(jsonPath("$.data[?(@.nombreProducto == 'Oculto en catalogo')]").doesNotExist())
            .andExpect(jsonPath("$.data[?(@.nombreProducto == 'Inactivo')]").doesNotExist());
    }

    @Test
    @DisplayName("El relleno con otras categorías también aplica la regla")
    void rellenoRespetaCatalogoPublico() throws Exception {
        Empresa publica = crearEmpresa("Tienda Publica", "rec-publica", "rec-pub@test.cr", "ACTIVO", true);
        Empresa caja = crearEmpresa("Caja", "rec-caja", "rec-caja@test.cr", "ACTIVO", false);
        Producto base = crearProducto("Base", "SKU-REC-0", publica, true);
        Categoria otra = new Categoria();
        otra.setNombreCategoria("Test-Cat-Rec-Otra");
        otra.setEstado(Constants.ESTADO_ACTIVO);
        otra.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(otra);
        crearProducto("Visible OK", "SKU-REC-1", publica, true);
        crearProducto("De Caja", "SKU-REC-2", caja, true);

        mockMvc.perform(get("/api/productos/" + base.getId() + "/recomendaciones?limit=10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.nombreProducto == 'Visible OK')]").exists())
            .andExpect(jsonPath("$.data[?(@.nombreProducto == 'De Caja')]").doesNotExist());
    }

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
