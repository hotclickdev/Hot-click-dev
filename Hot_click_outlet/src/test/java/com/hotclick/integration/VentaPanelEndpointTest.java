package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /api/ventas: método, estado inicial, origen, envío y bodega acotados a la regla del registro manual. */
@DisplayName("POST /api/ventas | registro manual acotado")
class VentaPanelEndpointTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;

    private Empresa empresa;
    private Empresa otraEmpresa;
    private Bodega bodega;
    private Bodega bodegaAjena;
    private Producto producto;
    private String token;

    private Empresa nuevaEmpresa(String nombre, String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("PENDIENTE");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Bodega nuevaBodega(String nombre, Empresa dueno) {
        Bodega b = new Bodega();
        b.setNombreBodega(nombre);
        b.setDireccionExacta("Calle 1");
        b.setTelefono("88880000");
        b.setHorarioApertura(LocalTime.of(8, 0));
        b.setHorarioCierre(LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(dueno);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empresa = nuevaEmpresa("Venta Panel", "venta-panel");
        otraEmpresa = nuevaEmpresa("Venta Panel Ajena", "venta-panel-ajena");
        Usuario dueno = crearUsuario("venta-panel-dueno@test.cr", "Dueno Panel", rolEmp);
        dueno.setEmpresa(empresa);
        dueno = usuarioRepository.saveAndFlush(dueno);
        token = "Bearer " + jwtUtil.generateToken(dueno.getCorreo(), dueno.getId(), Constants.ROL_EMPRENDEDOR,
            empresa.getId(), empresa.getSlug());

        Categoria categoria = categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Cat-Venta-Panel");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
        bodega = nuevaBodega("Despacho Panel", empresa);
        bodegaAjena = nuevaBodega("Despacho Ajeno", otraEmpresa);

        producto = new Producto();
        producto.setNombreProducto("Panel Prod");
        producto.setSku("SKU-VENTA-PANEL");
        producto.setPrecioVenta(10000);
        producto.setPrecioCompra(7000);
        producto.setStockActual(5);
        producto.setStockMinimo(1);
        producto.setEstado(Constants.ESTADO_ACTIVO);
        producto.setCategoria(categoria);
        producto.setEmpresa(empresa);
        producto.setBodega(bodega);
        producto.setAdminCliente(adminUser);
        producto.setFechaCreacion(LocalDateTime.now());
        producto = productoRepository.saveAndFlush(producto);
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        usuarioRepository.findAll().stream().filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private String body(String extra) {
        return String.format("{\"bodegaId\":%d,\"items\":[{\"productoId\":%d,\"cantidad\":1}]%s}",
            bodega.getId(), producto.getId(), extra);
    }

    private org.springframework.test.web.servlet.ResultActions enviar(String json) throws Exception {
        return mockMvc.perform(post("/api/ventas").header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private int stock() {
        return productoRepository.findById(producto.getId()).orElseThrow().getStockActual();
    }

    @Test
    @DisplayName("SINPE → 400 con codigo estable, sin pedido ni descuento de stock")
    void sinpeRechazado() throws Exception {
        enviar(body(",\"metodoPago\":\"SINPE\",\"estadoInicial\":\"PAGADO\""))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.data.codigo").value("VENTA_METODO_REQUIERE_PASARELA"));
        assertThat(pedidoRepository.count()).isZero();
        assertThat(stock()).isEqualTo(5);
    }

    @Test
    @DisplayName("efectivo con estadoInicial=PAGADO → 200 y la respuesta trae el estado real persistido")
    void efectivoPagadoDevuelveEstadoReal() throws Exception {
        enviar(body(",\"metodoPago\":\"EFECTIVO\",\"estadoInicial\":\"PAGADO\""))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estadoPedido").value(Constants.PEDIDO_PENDIENTE));
        Pedido guardado = pedidoRepository.findAll().get(0);
        assertThat(guardado.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(stock()).isEqualTo(4);
    }

    @Test
    @DisplayName("efectivo con retiro sin estado → COMPLETADO y origen siempre MANUAL aunque llegue otro")
    void origenForzadoManual() throws Exception {
        enviar(body(",\"metodoPago\":\"EFECTIVO\",\"origen\":\"ONLINE\""))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estadoPedido").value(Constants.PEDIDO_COMPLETADO));
        assertThat(pedidoRepository.findAll().get(0).getOrigen()).isEqualTo("MANUAL");
    }

    @Test
    @DisplayName("metodoEnvio fuera de la lista permitida → 400 sin efectos")
    void metodoEnvioInvalido() throws Exception {
        enviar(body(",\"metodoPago\":\"EFECTIVO\",\"metodoEnvio\":\"CUALQUIER_COSA\""))
            .andExpect(status().isBadRequest());
        assertThat(pedidoRepository.count()).isZero();
        assertThat(stock()).isEqualTo(5);
    }

    @Test
    @DisplayName("bodega de otro negocio → 400 sin efectos")
    void bodegaAjena() throws Exception {
        String json = String.format("{\"bodegaId\":%d,\"metodoPago\":\"EFECTIVO\","
            + "\"items\":[{\"productoId\":%d,\"cantidad\":1}]}", bodegaAjena.getId(), producto.getId());
        enviar(json).andExpect(status().isBadRequest());
        assertThat(pedidoRepository.count()).isZero();
        assertThat(stock()).isEqualTo(5);
    }
}
