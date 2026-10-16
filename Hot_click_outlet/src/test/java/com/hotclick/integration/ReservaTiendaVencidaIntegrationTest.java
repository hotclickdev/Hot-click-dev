package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** NP-22: la reserva de un pedido de tienda propia vence y libera stock; antes del plazo no se toca. */
@DisplayName("[NP-22] Reserva de tienda propia con vencimiento")
class ReservaTiendaVencidaIntegrationTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private PedidoRepository    pedidoRepository;
    @Autowired private com.hotclick.service.payment.ReservaTiendaVencidaService reservaTiendaVencida;

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
    @DisplayName("Antes de 72 h la reserva sigue; después se cancela y el stock vuelve")
    void reservaVenceYLibera() throws Exception {
        Producto p = preparar("reserva-np22", true);
        pedir("reserva-np22", p, "SINPE_MOVIL").andExpect(status().isOk());
        Assertions.assertEquals(1, productoRepository.findById(p.getId()).orElseThrow().getStockReservado());

        Assertions.assertEquals(0, reservaTiendaVencida.ejecutar(LocalDateTime.now(Constants.ZONA_CR).plusHours(71)));
        Assertions.assertEquals(1, productoRepository.findById(p.getId()).orElseThrow().getStockReservado());

        Assertions.assertEquals(1, reservaTiendaVencida.ejecutar(LocalDateTime.now(Constants.ZONA_CR).plusHours(73)));
        Assertions.assertEquals(0, productoRepository.findById(p.getId()).orElseThrow().getStockReservado());
        Pedido pedido = pedidoRepository.findAll().get(0);
        Assertions.assertEquals(Constants.PEDIDO_CANCELADO, pedido.getEstadoPedido());
    }

    private org.springframework.test.web.servlet.ResultActions pedir(String slug, Producto p, String metodo) throws Exception {
        String body = """
            {"nombreCliente":"Ana QA","correoCliente":"ana-%s@test.cr","telefonoCliente":"88887777",
             "direccionEntrega":"San José, centro","metodoPago":"%s","metodoEnvio":"DOMICILIO",
             "items":[{"productoId":%d,"cantidad":1}]}
            """.formatted(slug, metodo, p.getId());
        return mockMvc.perform(post("/api/tienda/" + slug + "/pedidos")
            .contentType(MediaType.APPLICATION_JSON).content(body));
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
