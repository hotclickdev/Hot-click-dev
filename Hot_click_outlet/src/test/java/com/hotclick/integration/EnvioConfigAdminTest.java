package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.payment.OrderPricingService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.Comparator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * A-2 y MED-3 (c) Auditor 3: montos de envío configurables solo por ADMIN (defaults 4.000 / 5.500 / 5.000,
 * rango 0..50.000) y el pedido de tienda clasifica GAM o fuera del GAM en el servidor (desconocido = fuera).
 */
@org.springframework.test.context.TestPropertySource(properties = "hotclick.envio.normal.contra-entrega.habilitada=false")
@DisplayName("A-2 | montos de envío configurables y zona en el pedido de tienda")
class EnvioConfigAdminTest extends BaseIntegrationTest {

    private static final String URL = "/api/admin/configuracion/envio";

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private PedidoRepository    pedidoRepository;
    @Autowired private OrderPricingService orderPricingService;

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("UPDATE hot_click_config_envio_tb SET monto_gam_crc = 4000, monto_fuera_gam_crc = 5500, "
            + "monto_rapido_crc = 5000 WHERE id = 1");
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

    private static String montos(Object gam, Object fuera, Object rapido) {
        return "{\"montoGamCrc\":" + gam + ",\"montoFueraGamCrc\":" + fuera + ",\"montoRapidoCrc\":" + rapido + "}";
    }

    @Test
    @DisplayName("Defaults: GAM ₡4.000, fuera del GAM ₡5.500, rápido ₡5.000 (admin y lectura pública)")
    void defaults() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.montoGamCrc").value(4000))
            .andExpect(jsonPath("$.data.montoFueraGamCrc").value(5500))
            .andExpect(jsonPath("$.data.montoRapidoCrc").value(5000));
        mockMvc.perform(get("/api/public/envio/montos"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.montoGamCrc").value(4000))
            .andExpect(jsonPath("$.data.montoFueraGamCrc").value(5500))
            .andExpect(jsonPath("$.data.montoRapidoCrc").value(5000));
        assertThat(orderPricingService.calcularCostoEnvio("ENVIO_NORMAL_GAM")).isEqualTo(4000);
        assertThat(orderPricingService.calcularCostoEnvio("ENVIO_NORMAL_FUERA_GAM")).isEqualTo(5500);
        assertThat(orderPricingService.calcularCostoEnvio("ENVIO_RAPIDO")).isEqualTo(5000);
    }

    @Test
    @DisplayName("ADMIN configura los tres montos y el checkout los aplica")
    void adminConfiguraYSeAplica() throws Exception {
        mockMvc.perform(put(URL).header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(montos(3500, 7000, 6500)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.montoFueraGamCrc").value(7000));
        assertThat(orderPricingService.calcularCostoEnvio("ENVIO_NORMAL_GAM")).isEqualTo(3500);
        assertThat(orderPricingService.calcularCostoEnvio("ENVIO_NORMAL_FUERA_GAM")).isEqualTo(7000);
        assertThat(orderPricingService.calcularCostoEnvio("ENVIO_RAPIDO")).isEqualTo(6500);
        mockMvc.perform(get("/api/public/envio/montos"))
            .andExpect(jsonPath("$.data.montoRapidoCrc").value(6500));
    }

    @Test
    @DisplayName("No ADMIN: PUT y GET de admin 403; sin sesión 401")
    void noAdmin403() throws Exception {
        mockMvc.perform(put(URL).header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content(montos(0, 0, 0)))
            .andExpect(status().isForbidden());
        mockMvc.perform(get(URL).header("Authorization", userToken)).andExpect(status().isForbidden());
        mockMvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON).content(montos(0, 0, 0)))
            .andExpect(status().isUnauthorized());
        assertThat(orderPricingService.calcularCostoEnvio("ENVIO_NORMAL_GAM")).isEqualTo(4000);
    }

    @Test
    @DisplayName("Valores inválidos: 400 y no cambia nada")
    void invalido400() throws Exception {
        for (String body : new String[]{montos(-1, 5500, 5000), montos(4000, 50001, 5000), montos(4000, 5500, "\"abc\""),
                "{\"montoGamCrc\":4000}", montos(4000, 5500, 12.5)}) {
            mockMvc.perform(put(URL).header("Authorization", adminToken)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        }
        assertThat(orderPricingService.calcularCostoEnvio("ENVIO_NORMAL_FUERA_GAM")).isEqualTo(5500);
    }

    @Test
    @DisplayName("MED-3 (c): pedido de tienda con destino fuera del GAM cobra fuera del GAM; desconocido también")
    void tiendaClasificaZona() throws Exception {
        Producto p = preparar("envio-zona");
        assertThat(pedir("envio-zona", p, "Limón", "Siquirres", 1)).isEqualTo(5500);
        assertThat(pedir("envio-zona", p, null, null, 2)).isEqualTo(5500);
        assertThat(pedir("envio-zona", p, "Heredia", "Belén", 3)).isEqualTo(4000);
    }

    private int pedir(String slug, Producto p, String provincia, String canton, int n) throws Exception {
        String zona = (provincia != null ? ",\"provincia\":\"" + provincia + "\"" : "")
            + (canton != null ? ",\"canton\":\"" + canton + "\"" : "");
        String body = """
            {"nombreCliente":"Ana QA","correoCliente":"ana-%s-%d@test.cr","telefonoCliente":"88887777",
             "direccionEntrega":"Del parque 100 m norte","metodoPago":"SINPE_MOVIL","metodoEnvio":"DOMICILIO"%s,
             "items":[{"productoId":%d,"cantidad":1}]}
            """.formatted(slug, n, zona, p.getId());
        mockMvc.perform(post("/api/tienda/" + slug + "/pedidos").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());
        Pedido ultimo = pedidoRepository.findAll().stream().max(Comparator.comparing(Pedido::getId)).orElseThrow();
        assertThat(ultimo.getTotalPedido()).isEqualTo(8500 + ultimo.getCostoEnvio());
        return ultimo.getCostoEnvio();
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
        b.setAceptaEfectivo(false);
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(e);
        b.setEstado(Constants.ESTADO_ACTIVO);
        b = bodegaRepository.saveAndFlush(b);
        e.setBodegaVentaOnline(b);
        empresaRepository.saveAndFlush(e);

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
        p.setStockActual(10);
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
