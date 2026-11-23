package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Una empresa es_prueba no sale en ninguna consulta pública de productos (feed, sitemap, listados, publicable). */
@DisplayName("Catálogo público: las tiendas es_prueba quedan fuera")
class CatalogoPublicoEsPruebaTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;

    private Categoria categoria;
    private Producto real;
    private Producto prueba;
    private Empresa empReal;
    private Empresa empPrueba;

    @BeforeEach
    void setUp() {
        Categoria c = new Categoria();
        c.setNombreCategoria("Cat es_prueba");
        c.setEstado(Constants.ESTADO_ACTIVO);
        c.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(c);
        empReal = empresa("Real", "real-ep", false);
        empPrueba = empresa("Prueba", "prueba-ep", true);
        real = producto("Real", "SKU-EP-1", empReal);
        prueba = producto("Prueba", "SKU-EP-2", empPrueba);
    }

    @AfterEach
    void tearDown() {
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream().filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private static List<Long> ids(List<Producto> l) { return l.stream().map(Producto::getId).toList(); }

    @Test
    @DisplayName("feed, sitemap, ofertas y esPublicable excluyen el producto de la tienda de prueba")
    void feedSitemapOfertasYPublicable() {
        assertThat(ids(productoRepository.findParaFeed())).contains(real.getId()).doesNotContain(prueba.getId());
        assertThat(ids(productoRepository.findActivosVisibles())).contains(real.getId()).doesNotContain(prueba.getId());
        assertThat(ids(productoRepository.findByEnOfertaTrueAndVisibleCatalogoTrue())).doesNotContain(prueba.getId());
        assertThat(productoRepository.esPublicable(real.getId())).isTrue();
        assertThat(productoRepository.esPublicable(prueba.getId())).isFalse();
    }

    @Test
    @DisplayName("listados públicos (catálogo, destacados, carrusel, categoría, nombre) excluyen la tienda de prueba")
    void listadosPublicos() {
        var pg = PageRequest.of(0, 50);
        assertThat(ids(productoRepository.findByEstadoAndEmpresaAprobada(1, pg).getContent()))
            .contains(real.getId()).doesNotContain(prueba.getId());
        assertThat(ids(productoRepository.findDestacadosPublicos(1))).doesNotContain(prueba.getId());
        assertThat(ids(productoRepository.findCarruselPublico(1))).doesNotContain(prueba.getId());
        assertThat(ids(productoRepository.findByCategoriaPublico(categoria.getId(), 1, pg).getContent()))
            .contains(real.getId()).doesNotContain(prueba.getId());
        assertThat(ids(productoRepository.findByNombrePublico("a", 1, pg).getContent()))
            .contains(real.getId()).doesNotContain(prueba.getId());
        assertThat(productoRepository.findProductosDeSector("no-existe", pg)).isEmpty();
    }

    @Test
    @DisplayName("el listado por empresa de una tienda de prueba sale vacío (el slug no la rechaza)")
    void listadoPorEmpresaDeTiendaDePrueba() {
        var pg = PageRequest.of(0, 50);
        assertThat(productoRepository.findCatalogoPublicoByEmpresa(empPrueba.getId(), pg).getContent()).isEmpty();
        assertThat(productoRepository.findCatalogoPublicoByEmpresaAndNombre(empPrueba.getId(), "P", pg).getContent()).isEmpty();
        assertThat(productoRepository.findProductoPublicoByEmpresaAndId(empPrueba.getId(), prueba.getId())).isEmpty();
        assertThat(productoRepository.findCatalogoPublicoByEmpresa(empReal.getId(), pg).getContent()).hasSize(1);
        assertThat(productoRepository.findProductoPublicoByEmpresaAndId(empReal.getId(), real.getId())).isPresent();
    }

    private Empresa empresa(String nombre, String slug, boolean esPrueba) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        e.setEsPrueba(esPrueba);
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Producto producto(String nombre, String sku, Empresa empresa) {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega " + sku);
        b.setDireccionExacta("Calle Test 1");
        b.setTelefono("00000006");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        bodegaRepository.saveAndFlush(b);
        Producto p = new Producto();
        p.setNombreProducto(nombre);
        p.setSku(sku);
        p.setPrecioVenta(10000);
        p.setPrecioCompra(6000);
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setEnOferta(true);
        p.setDestacado(true);
        p.setEnCarrusel(true);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(b);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }
}
