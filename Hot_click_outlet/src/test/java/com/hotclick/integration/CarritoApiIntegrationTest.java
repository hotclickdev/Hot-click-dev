package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * QA5-CA-01: GET /api/carrito y POST items daban 500 (Jackson serializaba Carrito→usuarioFinal→
 * Usuario.roles LAZY fuera de sesión) y DELETE /vaciar respondía 200 pero dejaba las filas
 * (OneToMany sin orphanRemoval).
 */
@DisplayName("[QA5-CA-01] Carrito API: sin 500 por LAZY y vaciar borra los ítems")
class CarritoApiIntegrationTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private CarritoRepository   carritoRepository;

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM hot_click_carrito_item_tb");
        carritoRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        empresaRepository.findAll().forEach(e -> { e.setBodegaVentaOnline(null); empresaRepository.save(e); });
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("GET, POST items y vaciar: 200 sin exponer Usuario, y vaciar deja 0 filas y libera la reserva")
    void carritoCompleto() throws Exception {
        Producto p = preparar("carrito-ca01", true);
        String token = "Bearer " + jwtUtil.generateToken(testUser.getCorreo(), testUser.getId(), Constants.ROL_USUARIO_FINAL,
            p.getEmpresa().getId(), "carrito-ca01");

        String body = mockMvc.perform(get("/api/carrito/" + testUser.getId()).header("Authorization", token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").isNumber())
            .andExpect(jsonPath("$.data.usuarioFinal").doesNotExist())
            .andReturn().getResponse().getContentAsString();
        long carritoId = new com.fasterxml.jackson.databind.ObjectMapper().readTree(body).at("/data/id").asLong();

        mockMvc.perform(post("/api/carrito/" + carritoId + "/items").header("Authorization", token)
                .param("productoId", p.getId().toString()).param("cantidad", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[0].productoId").value(p.getId()))
            .andExpect(jsonPath("$.data.items[0].cantidad").value(2));
        Assertions.assertEquals(1, filas(carritoId));
        Assertions.assertEquals(2, productoRepository.findById(p.getId()).orElseThrow().getStockReservado());

        mockMvc.perform(delete("/api/carrito/" + carritoId + "/vaciar").header("Authorization", token))
            .andExpect(status().isOk());
        Assertions.assertEquals(0, filas(carritoId), "vaciar debe borrar las filas (orphanRemoval)");
        Assertions.assertEquals(0, productoRepository.findById(p.getId()).orElseThrow().getStockReservado());

        // 2.º vaciar idempotente: no libera de más.
        mockMvc.perform(delete("/api/carrito/" + carritoId + "/vaciar").header("Authorization", token))
            .andExpect(status().isOk());
        Assertions.assertEquals(0, productoRepository.findById(p.getId()).orElseThrow().getStockReservado());
    }

    private int filas(long carritoId) {
        return jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hot_click_carrito_item_tb WHERE fk_id_carrito = ?", Integer.class, carritoId);
    }

    private Producto preparar(String slug, boolean aceptaEfectivo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa("Tienda " + slug);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        e.setFechaRegistro(LocalDateTime.now());
        e = empresaRepository.saveAndFlush(e);

        Bodega b = new Bodega();
        b.setNombreBodega("Bodega " + slug);
        b.setDireccionExacta("Calle 1");
        b.setTelefono("61234567");
        b.setProvincia("San José");
        b.setCanton("Escazú");
        b.setPermiteRetiroCliente(false);
        b.setAceptaEfectivo(aceptaEfectivo);
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(e);
        b.setEstado(Constants.ESTADO_ACTIVO);
        b = bodegaRepository.saveAndFlush(b);
        e.setBodegaVentaOnline(b);
        e = empresaRepository.saveAndFlush(e);

        Categoria c = new Categoria();
        c.setNombreCategoria("Cat-" + slug);
        c.setEstado(Constants.ESTADO_ACTIVO);
        c.setAdminCliente(adminUser);
        c = categoriaRepository.saveAndFlush(c);

        Producto p = new Producto();
        p.setNombreProducto("Prod " + slug);
        p.setSku("SKU-" + slug);
        p.setPrecioVenta(8500);
        p.setPrecioCompra(5000);
        p.setStockActual(5);
        p.setStockReservado(0);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setCategoria(c);
        p.setEmpresa(e);
        p.setBodega(b);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }
}
