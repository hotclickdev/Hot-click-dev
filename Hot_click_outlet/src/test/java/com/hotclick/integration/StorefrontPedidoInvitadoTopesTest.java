package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * H1 (S1-56): POST /api/tienda/{slug}/pedidos dejaba a un anónimo reservar 999 u por producto.
 * Ahora: @Max 3 por ítem, GuestCheckoutGuard (3 u por producto, 6 u pendientes por IP/correo en 30 min)
 * e idempotencia por Idempotency-Key.
 */
@DisplayName("[H1 S1-56] Topes de invitado en la tienda propia")
class StorefrontPedidoInvitadoTopesTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private PedidoRepository    pedidoRepository;

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
    @DisplayName("1. 999 u de un producto → 400 y sin reserva de stock")
    void novecientas_400() throws Exception {
        Producto p = preparar("h1-999");
        mockMvc.perform(pedido("h1-999", "a@test.cr", "10.0.0.1", items(p.getId(), 999))).andExpect(status().isBadRequest());
        assertThat(productoRepository.findById(p.getId()).orElseThrow().getStockReservado()).isZero();
        assertThat(pedidoRepository.count()).isZero();
    }

    @Test
    @DisplayName("2. 4 u en un ítem → 400 (@Max 3)")
    void cuatro_400() throws Exception {
        Producto p = preparar("h1-4");
        mockMvc.perform(pedido("h1-4", "b@test.cr", "10.0.0.2", items(p.getId(), 4))).andExpect(status().isBadRequest());
        assertThat(pedidoRepository.count()).isZero();
    }

    @Test
    @DisplayName("3. Mismo producto repartido en dos ítems (2+2) → 429 del guard")
    void repartido_429() throws Exception {
        Producto p = preparar("h1-rep");
        String it = "[{\"productoId\":%d,\"cantidad\":2},{\"productoId\":%d,\"cantidad\":2}]".formatted(p.getId(), p.getId());
        mockMvc.perform(pedido("h1-rep", "c@test.cr", "10.0.0.3", it)).andExpect(status().isTooManyRequests());
        assertThat(pedidoRepository.count()).isZero();
    }

    @Test
    @DisplayName("4. Tres pedidos de 3 u desde la misma IP → el tercero 429")
    void tercerPedido_429() throws Exception {
        Producto p = preparar("h1-ip");
        mockMvc.perform(pedido("h1-ip", "d1@test.cr", "10.0.0.4", items(p.getId(), 3))).andExpect(status().isOk());
        mockMvc.perform(pedido("h1-ip", "d2@test.cr", "10.0.0.4", items(p.getId(), 3))).andExpect(status().isOk());
        mockMvc.perform(pedido("h1-ip", "d3@test.cr", "10.0.0.4", items(p.getId(), 3))).andExpect(status().isTooManyRequests());
        assertThat(pedidoRepository.count()).isEqualTo(2);
    }

    @Test
    @DisplayName("5. Mismo correo desde otra IP también suma al cupo → 429")
    void mismoCorreo_429() throws Exception {
        Producto p = preparar("h1-mail");
        mockMvc.perform(pedido("h1-mail", "e@test.cr", "10.0.1.1", items(p.getId(), 3))).andExpect(status().isOk());
        mockMvc.perform(pedido("h1-mail", "e@test.cr", "10.0.1.2", items(p.getId(), 3))).andExpect(status().isOk());
        mockMvc.perform(pedido("h1-mail", "e@test.cr", "10.0.1.3", items(p.getId(), 1))).andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("6. Doble POST con el mismo Idempotency-Key → un solo pedido y misma respuesta")
    void idempotencia_unPedido() throws Exception {
        Producto p = preparar("h1-idem");
        String r1 = mockMvc.perform(pedido("h1-idem", "f@test.cr", "10.0.0.6", items(p.getId(), 2)).header("Idempotency-Key", "h1-idem-1"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String r2 = mockMvc.perform(pedido("h1-idem", "f@test.cr", "10.0.0.6", items(p.getId(), 2)).header("Idempotency-Key", "h1-idem-1"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(r2).isEqualTo(r1);
        assertThat(pedidoRepository.count()).isEqualTo(1);
        assertThat(productoRepository.findById(p.getId()).orElseThrow().getStockReservado()).isEqualTo(2);
    }

    private static String items(Long id, int cantidad) {
        return "[{\"productoId\":%d,\"cantidad\":%d}]".formatted(id, cantidad);
    }

    private MockHttpServletRequestBuilder pedido(String slug, String correo, String ip, String items) {
        String body = """
            {"nombreCliente":"Ana QA","correoCliente":"%s","telefonoCliente":"88887777",
             "direccionEntrega":"San José, centro","metodoPago":"SINPE_MOVIL","metodoEnvio":"DOMICILIO","provincia":"San José","canton":"San José",
             "items":%s}
            """.formatted(correo, items);
        return post("/api/tienda/" + slug + "/pedidos")
            .with(r -> { r.setRemoteAddr(ip); return r; })
            .contentType(MediaType.APPLICATION_JSON).content(body);
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
