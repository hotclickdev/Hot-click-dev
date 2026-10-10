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

/**
 * QA-114-1: el pedido con efectivo en la tienda propia daba 500 (LazyInitialization al leer
 * aceptaEfectivo de la bodega de venta online de una Empresa desacoplada). Ahora: 200 si la
 * bodega acepta efectivo y 400 limpio si no.
 */
@DisplayName("[QA-114-1] Pedido de tienda propia con efectivo")
class StorefrontPedidoEfectivoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private PedidoRepository    pedidoRepository;

    @AfterEach
    void tearDown() {
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
    @DisplayName("Tienda que acepta efectivo: el pedido se crea (200, no 500)")
    void aceptaEfectivo_creaPedido() throws Exception {
        Producto p = preparar("efectivo-si", true);
        pedir("efectivo-si", p, "EFECTIVO")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroPedido").exists());
    }

    @Test
    @DisplayName("Tienda sin efectivo: forzar EFECTIVO devuelve 400 con mensaje")
    void noAceptaEfectivo_400() throws Exception {
        Producto p = preparar("efectivo-no", false);
        pedir("efectivo-no", p, "EFECTIVO")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("efectivo")));
    }

    @Test
    @DisplayName("Tienda sin efectivo: SINPE sigue funcionando")
    void noAceptaEfectivo_sinpeOk() throws Exception {
        Producto p = preparar("efectivo-sinpe", false);
        pedir("efectivo-sinpe", p, "SINPE_MOVIL").andExpect(status().isOk());
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
