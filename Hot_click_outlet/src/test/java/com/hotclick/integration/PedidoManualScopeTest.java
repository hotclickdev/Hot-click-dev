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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("P7-02 | pedido manual acotado al negocio del vendedor")
class PedidoManualScopeTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;

    private Empresa empA, empB;
    private Bodega bodA;
    private Producto prodA, prodB;
    private Usuario cliA, cliB;
    private Categoria categoria;
    private String tokenA;

    @BeforeEach
    void setUp() {
        empA = empresa("P702 A", "p702-a");
        empB = empresa("P702 B", "p702-b");
        categoria = new Categoria();
        categoria.setNombreCategoria("Cat-P702");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);
        bodA = bodega(empA);
        prodA = producto(empA, bodA, "P702-A");
        prodB = producto(empB, bodega(empB), "P702-B");
        Rol rolUser = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        cliA = crearUsuario("p702-cli-a@test.cr", "Cli A", rolUser);
        cliA.setEmpresaRegistro(empA);
        cliA = usuarioRepository.saveAndFlush(cliA);
        cliB = crearUsuario("p702-cli-b@test.cr", "Cli B", rolUser);
        cliB.setEmpresaRegistro(empB);
        cliB = usuarioRepository.saveAndFlush(cliB);
        Usuario vend = crearUsuario("p702-vend@test.cr", "Vend", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        tokenA = "Bearer " + jwtUtil.generateToken(vend.getCorreo(), vend.getId(), Constants.ROL_EMPRENDEDOR, empA.getId(), empA.getSlug());
    }

    @AfterEach
    void tearDown() {
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.delete(categoria);
        usuarioRepository.findAll().forEach(u -> { u.setEmpresaRegistro(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private String body(long usuarioId, long productoId, String estado, int precio) {
        return "{\"usuarioId\":" + usuarioId + ",\"bodegaId\":1,\"metodoEnvio\":\"RETIRO\",\"metodoPago\":\"EFECTIVO\","
            + "\"costoEnvio\":0,\"estadoPedido\":\"" + estado + "\",\"items\":[{\"productoId\":" + productoId
            + ",\"cantidad\":1,\"precioUnitario\":" + precio + "}]}";
    }

    private org.springframework.test.web.servlet.ResultActions enviar(String b) throws Exception {
        return mockMvc.perform(post("/api/pedidos/manual").header("Authorization", tokenA)
            .contentType(MediaType.APPLICATION_JSON).content(b));
    }

    @Test
    void clienteDeOtroNegocio404SinPii() throws Exception {
        enviar(body(cliB.getId(), prodA.getId(), "PENDIENTE", 1000)).andExpect(status().isNotFound())
            .andExpect(content().string(not(containsString("p702-cli-b"))));
    }

    @Test
    void productoDeOtroNegocio404() throws Exception {
        enviar(body(cliA.getId(), prodB.getId(), "PENDIENTE", 1000)).andExpect(status().isNotFound());
    }

    @Test
    void estadoFinalYPrecioInflado400() throws Exception {
        enviar(body(cliA.getId(), prodA.getId(), "ENTREGADO", 1000)).andExpect(status().isBadRequest());
        enviar(body(cliA.getId(), prodA.getId(), "PENDIENTE", 999_999)).andExpect(status().isBadRequest());
        enviar(body(cliA.getId(), prodA.getId(), "PENDIENTE", -1)).andExpect(status().isBadRequest());
        assertThat(pedidoRepository.count()).isZero();
    }

    @Test
    void pedidoValidoUsaBodegaDelNegocio() throws Exception {
        enviar(body(cliA.getId(), prodA.getId(), "PENDIENTE", 1000)).andExpect(status().isOk());
        Pedido p = pedidoRepository.findAll().get(0);
        assertThat(p.getBodega().getId()).isEqualTo(bodA.getId());
        assertThat(p.getEmpresa().getId()).isEqualTo(empA.getId());
    }

    @Test
    @DisplayName("QA5-M-01 | admin de plataforma (empresa=null) asigna compra → 200, 1 pedido, ENTREGADO")
    void adminPlataformaAsignaCompraSinEmpresa() throws Exception {
        String b = "{\"usuarioId\":" + cliA.getId() + ",\"bodegaId\":" + bodA.getId()
            + ",\"items\":[{\"productoId\":" + prodA.getId() + ",\"cantidad\":1,\"precioUnitario\":1000}]}";
        mockMvc.perform(post("/api/admin/asignar/compra").header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(b))
            .andExpect(status().isOk());
        assertThat(pedidoRepository.count()).isEqualTo(1);
        assertThat(pedidoRepository.findAll().get(0).getEstadoPedido()).isEqualTo(Constants.PEDIDO_ENTREGADO);
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

    private Producto producto(Empresa e, Bodega b, String sku) {
        Producto p = new Producto();
        p.setNombreProducto("Prod " + sku);
        p.setDescripcionCorta("x");
        p.setSku(sku);
        p.setPrecioVenta(5000);
        p.setPrecioCompra(2000);
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
