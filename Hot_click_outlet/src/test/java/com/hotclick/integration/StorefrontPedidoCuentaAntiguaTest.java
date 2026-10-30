package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Seguridad sobre #399 (M2b): StorefrontGuestOrderService buscaba al comprador con findByCorreo(correo normalizado).
 * Una cuenta antigua guardada con mayúsculas («Juan@X.com», dato ficticio) no se encontraba y se creaba un invitado
 * duplicado: el pedido quedaba a nombre de otra cuenta. Ahora reutiliza GuestUserResolver (mismo criterio que
 * el checkout y SINPE): exacto, normalizado y, si no, la variante más antigua sin distinguir mayúsculas.
 */
@org.springframework.test.context.TestPropertySource(properties = "hotclick.envio.normal.contra-entrega.habilitada=false")
@DisplayName("[M2b #399] Pedido de tienda con cuenta antigua con mayúsculas no crea invitado duplicado")
class StorefrontPedidoCuentaAntiguaTest extends BaseIntegrationTest {

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

    private void pedir(String slug, Producto p, String correo) throws Exception {
        String body = """
            {"nombreCliente":"Juan QA","correoCliente":"%s","telefonoCliente":"88887777",
             "direccionEntrega":"San José, centro","metodoPago":"SINPE_MOVIL","metodoEnvio":"DOMICILIO","provincia":"San José","canton":"San José",
             "items":[{"productoId":%d,"cantidad":1}]}
            """.formatted(correo, p.getId());
        mockMvc.perform(post("/api/tienda/" + slug + "/pedidos")
            .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Juan@X.com guardada con mayúsculas: el pedido queda en su cuenta y no se crea un invitado")
    void cuentaAntiguaConMayusculas() throws Exception {
        Rol rol = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Usuario juan = crearUsuario("Juan@X.com", "Juan", rol);
        Producto p = preparar("m2b-tienda");

        pedir("m2b-tienda", p, "juan@x.com");

        List<Pedido> pedidos = pedidoRepository.findAll();
        assertThat(pedidos).hasSize(1);
        assertThat(pedidos.get(0).getUsuarioFinal().getId()).as("el pedido es de la cuenta existente").isEqualTo(juan.getId());
        assertThat(usuarioRepository.findAllByCorreoIgnoreCase("juan@x.com")).as("sin invitado duplicado").hasSize(1);
    }

    @Test
    @DisplayName("Correo nuevo: se crea un único invitado con el correo normalizado y se reutiliza en el pedido siguiente")
    void correoNuevoCreaUnInvitado() throws Exception {
        obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Producto p = preparar("m2b-nuevo");

        pedir("m2b-nuevo", p, "Maria.Fict@X.COM");
        pedir("m2b-nuevo", p, "maria.fict@x.com");

        assertThat(usuarioRepository.findAllByCorreoIgnoreCase("maria.fict@x.com")).hasSize(1);
        assertThat(usuarioRepository.findAllByCorreoIgnoreCase("maria.fict@x.com").get(0).getCorreo())
            .isEqualTo("maria.fict@x.com");
        assertThat(pedidoRepository.findAll()).isNotEmpty()
            .allSatisfy(pe -> assertThat(pe.getUsuarioFinal().getId())
                .isEqualTo(usuarioRepository.findAllByCorreoIgnoreCase("maria.fict@x.com").get(0).getId()));
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
