package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("IDOR catálogo | POST /api/pedidos con producto de otro negocio (consulta real a BD)")
class PedidoCatalogoIdorIntegrationTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;

    private Empresa empA, empB;
    private Producto prodA, prodB;
    private Bodega bodA;
    private Usuario cliA;
    private Categoria categoria;
    private String tokenA;

    @BeforeEach
    void setUp() {
        empA = empresa("IDOR A", "idor-a");
        empB = empresa("IDOR B", "idor-b");
        categoria = new Categoria();
        categoria.setNombreCategoria("Cat-IDOR");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);
        bodA = bodega(empA);
        prodA = producto(empA, bodA, "IDOR-A", 2000);
        prodB = producto(empB, bodega(empB), "IDOR-B", 777);
        cliA = crearUsuario("idor-cli-a@test.cr", "Cli A", obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1));
        cliA.setEmpresaRegistro(empA);
        cliA = usuarioRepository.saveAndFlush(cliA);
        Usuario vend = crearUsuario("idor-vend@test.cr", "Vend", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        vend.setEmpresa(empA);
        vend = usuarioRepository.saveAndFlush(vend);
        tokenA = "Bearer " + jwtUtil.generateToken(vend.getCorreo(), vend.getId(), Constants.ROL_EMPRENDEDOR, empA.getId(), empA.getSlug());
    }

    @AfterEach
    void tearDown() {
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.delete(categoria);
        usuarioRepository.findAll().forEach(u -> { u.setEmpresaRegistro(null); u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private org.springframework.test.web.servlet.ResultActions crear(long productoId) throws Exception {
        String json = "{\"metodoPago\":\"EFECTIVO\",\"metodoEnvio\":\"RETIRO\",\"usuarioFinal\":{\"id\":" + cliA.getId() + "},\"bodega\":{\"id\":" + bodA.getId() + "},\"items\":[{\"producto\":{\"id\":" + productoId + "},\"cantidad\":1}]}";
        return mockMvc.perform(post("/api/pedidos").header("Authorization", tokenA)
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    @DisplayName("EMPRENDEDOR de A + producto de B (precioCompra 777) → 4xx, sin pedido, sin filtrar costo")
    void productoDeOtroNegocioRechazadoSinFiltrar() throws Exception {
        var res = crear(prodB.getId()).andReturn().getResponse();
        assertThat(res.getStatus()).isIn(400, 404);
        assertThat(res.getContentAsString()).doesNotContain("777");
        assertThat(pedidoRepository.count()).isZero();
    }

    @Test
    @DisplayName("Control: producto del propio negocio → 200 con costo del catálogo")
    void productoPropioOk() throws Exception {
        crear(prodA.getId()).andExpect(status().isOk());
        assertThat(pedidoRepository.count()).isEqualTo(1);
        assertThat(pedidoRepository.findAll().get(0).getEmpresa().getId()).isEqualTo(empA.getId());
    }

    private Empresa empresa(String nombre, String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setNombreComercial(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Bodega bodega(Empresa e) {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega " + e.getSlug());
        b.setDireccionExacta("Calle 1");
        b.setTelefono("22223333");
        b.setAdminCliente(adminUser);
        b.setEmpresa(e);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Producto producto(Empresa e, Bodega b, String sku, int compra) {
        Producto p = new Producto();
        p.setNombreProducto("Prod " + sku);
        p.setDescripcionCorta("x");
        p.setSku(sku);
        p.setPrecioVenta(5000);
        p.setPrecioCompra(compra);
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setCategoria(categoria);
        p.setEmpresa(e);
        p.setBodega(b);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }
}
