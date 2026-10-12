package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** ESC-2 / MAN-4: venta POS en efectivo de un emprendedor con producto propio. */
@DisplayName("POS | venta en efectivo")
class PosVentaEfectivoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;

    private Empresa empresa;
    private Bodega bodega;
    private Producto producto;
    private String token;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empresa = new Empresa();
        empresa.setNombreEmpresa("Pos Efectivo");
        empresa.setSlug("pos-efectivo");
        empresa.setCorreoEmpresa("pos-ef@test.cr");
        empresa.setEstadoEmpresa("PENDIENTE");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(empresa);
        Usuario dueno = crearUsuario("pos-ef-dueno@test.cr", "Dueno Pos", rolEmp);
        dueno.setEmpresa(empresa);
        dueno = usuarioRepository.saveAndFlush(dueno);
        token = "Bearer " + jwtUtil.generateToken(dueno.getCorreo(), dueno.getId(), Constants.ROL_EMPRENDEDOR, empresa.getId(), empresa.getSlug());

        Categoria categoria = categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Cat-Pos");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
        bodega = new Bodega();
        bodega.setNombreBodega("Despacho Pos");
        bodega.setDireccionExacta("Calle 1");
        bodega.setTelefono("88880000");
        bodega.setHorarioApertura(LocalTime.of(8, 0));
        bodega.setHorarioCierre(LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);

        producto = new Producto();
        producto.setNombreProducto("Pos Prod");
        producto.setSku("SKU-POS-EF");
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

    private String body() {
        return String.format("{\"metodoPago\":\"EFECTIVO\",\"montoRecibido\":10000,\"descuentoGlobal\":0,"
            + "\"bodegaId\":%d,\"clienteId\":null,\"items\":[{\"productoId\":%d,\"cantidad\":1,\"precioUnitario\":10000}]}",
            bodega.getId(), producto.getId());
    }

    @Test
    @DisplayName("ESC-2 | efectivo exacto con producto propio → 200 y stock −1")
    void ventaEfectivo() throws Exception {
        mockMvc.perform(post("/api/pos/venta").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(body()))
            .andDo(print())
            .andExpect(status().isOk());
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockActual()).isEqualTo(4);
    }
}
