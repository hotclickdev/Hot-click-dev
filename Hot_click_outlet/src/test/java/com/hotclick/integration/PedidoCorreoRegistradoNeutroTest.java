package com.hotclick.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * S4-19: el pedido de invitado con un correo que ya tiene cuenta se crea igual (no bloquea) y la
 * respuesta no cambia: un tercero no puede saber si el correo existe. El aviso va solo por correo.
 */
@org.springframework.test.context.TestPropertySource(properties = "hotclick.envio.normal.contra-entrega.habilitada=false")
@DisplayName("S4-19 — pedido con correo ya registrado, respuesta neutra")
class PedidoCorreoRegistradoNeutroTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private PedidoRepository    pedidoRepository;
    @Autowired private ObjectMapper        objectMapper;

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
    void correoRegistrado_yNuevo_mismaFormaDeRespuesta() throws Exception {
        Producto p = preparar("correo-neutro", true);
        JsonNode registrado = pedir("correo-neutro", p, testUser.getCorreo(), 200);
        JsonNode nuevo = pedir("correo-neutro", p, "nadie-s419@test.cr", 200);

        assertThat(campos(registrado)).isEqualTo(campos(nuevo));
        assertThat(campos(registrado.path("data"))).isEqualTo(campos(nuevo.path("data")));
        assertThat(registrado.path("message").asText()).isEqualTo(nuevo.path("message").asText());
        assertThat(registrado.toString()).doesNotContain("cuenta").doesNotContain("login");
    }

    @Test
    void correoRegistrado_elPedidoQuedaEnSuCuenta() throws Exception {
        Producto p = preparar("correo-cuenta", true);
        pedir("correo-cuenta", p, testUser.getCorreo(), 200);
        assertThat(pedidoRepository.findAll())
            .anyMatch(x -> x.getUsuarioFinal() != null && testUser.getId().equals(x.getUsuarioFinal().getId()));
    }

    @Test
    void correoInvalido_400() throws Exception {
        Producto p = preparar("correo-malo", true);
        pedir("correo-malo", p, "no-es-un-correo", 400);
    }

    private static Set<String> campos(JsonNode n) {
        Set<String> s = new TreeSet<>();
        n.fieldNames().forEachRemaining(s::add);
        return s;
    }

    private JsonNode pedir(String slug, Producto p, String correo, int esperado) throws Exception {
        String body = """
            {"nombreCliente":"Ana QA","correoCliente":"%s","telefonoCliente":"88887777",
             "direccionEntrega":"San José, centro","metodoPago":"EFECTIVO","metodoEnvio":"DOMICILIO",
             "items":[{"productoId":%d,"cantidad":1}]}
            """.formatted(correo, p.getId());
        String r = mockMvc.perform(post("/api/tienda/" + slug + "/pedidos")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().is(esperado))
            .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(r);
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
