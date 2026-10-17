package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * QA-NEG-007 / QA-NEG-027: con dos pedidos de invitado el panel mostraba uno solo, sin código ORD, correo ni hora.
 * El listado del vendedor (GET /api/pedidos) devuelve los dos con numeroPedido, clienteCorreo y fechaCreacion.
 */
@DisplayName("[QA-NEG-027] Panel del vendedor con dos pedidos de invitado")
class PanelPedidosInvitadoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private PedidoRepository    pedidoRepository;
    private Empresa empresa;

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        empresaRepository.findAll().forEach(e -> { e.setBodegaVentaOnline(null); empresaRepository.save(e); });
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Dos invitados en la tienda propia → el dueño ve los dos con ORD, correo y fecha")
    void dosInvitados_ambosEnElPanel() throws Exception {
        Producto p = preparar("neg27");
        String item = "[{\"productoId\":%d,\"cantidad\":1}]".formatted(p.getId());
        pedir("neg27", "inv1-neg27@test.cr", "10.9.0.1", item);
        pedir("neg27", "inv2-neg27@test.cr", "10.9.0.2", item);

        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario dueno = crearUsuario("dueno-neg27@test.cr", "Dueno Neg27", rolEmp);
        dueno.setEmpresa(empresa);
        dueno = usuarioRepository.saveAndFlush(dueno);
        String token = "Bearer " + jwtUtil.generateToken(dueno.getCorreo(), dueno.getId(),
            Constants.ROL_EMPRENDEDOR, empresa.getId(), empresa.getSlug());

        mockMvc.perform(get("/api/pedidos").header("Authorization", token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(2))
            .andExpect(jsonPath("$.data[*].numeroPedido", everyItem(startsWith("ORD-"))))
            .andExpect(jsonPath("$.data[*].clienteCorreo",
                containsInAnyOrder("inv1-neg27@test.cr", "inv2-neg27@test.cr")))
            .andExpect(jsonPath("$.data[*].fechaCreacion", everyItem(notNullValue())));
    }

    private void pedir(String slug, String correo, String ip, String items) throws Exception {
        String body = """
            {"nombreCliente":"Ana QA","correoCliente":"%s","telefonoCliente":"88887777",
             "direccionEntrega":"San José, centro","metodoPago":"SINPE_MOVIL","metodoEnvio":"DOMICILIO",
             "items":%s}
            """.formatted(correo, items);
        mockMvc.perform(post("/api/tienda/" + slug + "/pedidos")
                .with(r -> { r.setRemoteAddr(ip); return r; })
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());
    }

    private Producto preparar(String slug) {
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
        b.setAceptaEfectivo(true);
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(e);
        b.setEstado(Constants.ESTADO_ACTIVO);
        b = bodegaRepository.saveAndFlush(b);
        e.setBodegaVentaOnline(b);
        e = empresaRepository.saveAndFlush(e);
        empresa = e;

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
        p.setStockActual(50);
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
