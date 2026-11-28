package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.FinanzasReporteService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * QA PR #678 (cupones retirados): los pedidos viejos que sí usaron cupón siguen leyéndose igual. El campo es de
 * solo lectura para el JSON de entrada, pero tiene que salir en el detalle, la lista del negocio, el historial del
 * comprador y sumar bien en el reporte; un cambio de estado no lo borra; otro negocio no lo ve.
 */
@DisplayName("QA #678 | pedidos históricos con cupón: lectura, reporte y aislamiento")
class CuponesHistoricosIntegrationTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private FinanzasReporteService finanzasReporteService;

    private Empresa empA;
    private Empresa empB;
    private Pedido historico;
    private String tokenA;
    private String tokenB;

    @BeforeEach
    void setUp() {
        empA = empresa("Hist Cupon A", "hist-cupon-a-" + System.nanoTime());
        empB = empresa("Hist Cupon B", "hist-cupon-b-" + System.nanoTime());
        Bodega bodA = bodega(empA);

        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-HIST-CUPON-1");
        p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        p.setEstadoPedido(Constants.PEDIDO_ENTREGADO);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodA);
        p.setEmpresa(empA);
        p.setSubtotal(10_000);
        p.setCuponCodigo("VIEJO10");
        p.setDescuentoTotal(1_000);
        p.setCostoEnvio(4_000);
        p.setTotalPedido(13_000);
        p.setCostoTotalProductos(5_000);
        p.setUtilidadBruta(4_000);
        p.setMetodoPago("SINPE");
        p.setMetodoEnvio("ENVIO_NORMAL_GAM");
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        p.setEsPrueba(false);
        historico = pedidoRepository.saveAndFlush(p);

        tokenA = tokenDueno(empA, "hist-cupon-a@test.cr");
        tokenB = tokenDueno(empB, "hist-cupon-b@test.cr");
    }

    @AfterEach
    void tearDown() {
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Detalle GET /api/pedidos/{id} (negocio dueño y comprador): cuponCodigo y descuentoTotal intactos")
    void detalle() throws Exception {
        for (String token : new String[]{tokenA, userToken}) {
            mockMvc.perform(get("/api/pedidos/" + historico.getId()).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cuponCodigo").value("VIEJO10"))
                .andExpect(jsonPath("$.data.descuentoTotal").value(1000))
                .andExpect(jsonPath("$.data.subtotal").value(10000))
                .andExpect(jsonPath("$.data.totalPedido").value(13000));
        }
    }

    @Test
    @DisplayName("Lista del negocio GET /api/pedidos e historial del comprador: el pedido viejo sale con su descuento")
    void listas() throws Exception {
        // La lista del panel (PedidoDetailMapper) nunca expuso cupón ni descuento, ni antes ni después del PR:
        // se verifica que el pedido viejo sigue saliendo con su total cobrado.
        mockMvc.perform(get("/api/pedidos").header("Authorization", tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].numeroPedido", hasItem("ORD-HIST-CUPON-1")))
            .andExpect(jsonPath("$.data[*].total", hasItem(13000)));
        mockMvc.perform(get("/api/pedidos/usuario/" + testUser.getId()).header("Authorization", userToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].cuponCodigo").value("VIEJO10"))
            .andExpect(jsonPath("$.data.content[0].descuentoTotal").value(1000));
    }

    @Test
    @DisplayName("Reporte financiero: el pedido viejo suma su total cobrado (con el cupón ya restado)")
    void reporte() {
        Map<String, Object> kpis = finanzasReporteService.calcularKpis(empA.getId(), null, null);
        assertThat(kpis.get("cantidadVentas")).isEqualTo(1L);
        assertThat(kpis.get("ventasTotales")).isEqualTo(13_000L);
        assertThat(kpis.get("subtotalProductos")).isEqualTo(10_000L);
        assertThat(kpis.get("utilidadBruta")).isEqualTo(4_000L);
    }

    @Test
    @DisplayName("Cambiar el estado de un pedido viejo no borra el cupón ni el descuento")
    void cambioDeEstadoConservaElDescuento() throws Exception {
        Pedido pendiente = pedidoRepository.findById(historico.getId()).orElseThrow();
        pendiente.setEstadoPedido(Constants.PEDIDO_PAGADO);
        pedidoRepository.saveAndFlush(pendiente);
        mockMvc.perform(put("/api/pedidos/" + historico.getId() + "/estado").header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"" + Constants.PEDIDO_EN_PREPARACION + "\",\"cuponCodigo\":null,\"descuentoTotal\":0}"))
            .andExpect(status().isOk());
        Pedido despues = pedidoRepository.findById(historico.getId()).orElseThrow();
        assertThat(despues.getEstadoPedido()).isEqualTo(Constants.PEDIDO_EN_PREPARACION);
        assertThat(despues.getCuponCodigo()).isEqualTo("VIEJO10");
        assertThat(despues.getDescuentoTotal()).isEqualTo(1000);
        assertThat(despues.getTotalPedido()).isEqualTo(13_000);
    }

    @Test
    @DisplayName("Aislamiento: el negocio B no ve el pedido histórico de A (ni su cupón) por id ni en su lista")
    void otroNegocioNoLoVe() throws Exception {
        var res = mockMvc.perform(get("/api/pedidos/" + historico.getId()).header("Authorization", tokenB))
            .andReturn().getResponse();
        assertThat(res.getStatus()).isIn(403, 404);
        assertThat(res.getContentAsString()).doesNotContain("VIEJO10");
        var lista = mockMvc.perform(get("/api/pedidos").header("Authorization", tokenB)).andReturn().getResponse();
        assertThat(lista.getStatus()).isEqualTo(200);
        assertThat(lista.getContentAsString()).doesNotContain("VIEJO10").doesNotContain("ORD-HIST-CUPON-1");
        assertThat(finanzasReporteService.calcularKpis(empB.getId(), null, null).get("cantidadVentas")).isEqualTo(0L);
    }

    @Test
    @DisplayName("Rutas viejas de cupones con ADMIN, comprador y sin sesión, en cualquier verbo: nunca 2xx")
    void rutasViejasNuncaResponden2xx() throws Exception {
        String[] rutas = {"/api/cupones", "/api/cupones/validar?codigo=VIEJO10", "/api/cupones/estadisticas",
            "/api/cupones/solicitar", "/api/cupones/1", "/api/tienda/cupones/validar?codigo=VIEJO10",
            "/api/admin/cupones"};
        String[] tokens = {adminToken, userToken, tokenA, null};
        for (String ruta : rutas) {
            for (String token : tokens) {
                for (String verbo : new String[]{"GET", "POST", "PUT", "DELETE"}) {
                    var req = org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .request(org.springframework.http.HttpMethod.valueOf(verbo), ruta)
                        .header("X-Tenant-Slug", empA.getSlug())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"qa@example.com\",\"codigo\":\"X\"}");
                    if (token != null) req.header("Authorization", token);
                    var res = mockMvc.perform(req).andReturn().getResponse();
                    assertThat(res.getStatus()).as(verbo + " " + ruta + (token == null ? " sin sesión" : ""))
                        .isIn(401, 403, 404, 405);
                    assertThat(res.getContentAsString()).doesNotContain("descuentoPorcentaje");
                }
            }
        }
    }

    private Empresa empresa(String nombre, String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        return empresaRepository.saveAndFlush(e);
    }

    private Bodega bodega(Empresa e) {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega " + e.getNombreEmpresa());
        b.setDireccionExacta("Calle 1");
        b.setTelefono("00000000");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(e);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private String tokenDueno(Empresa e, String correo) {
        Usuario u = crearUsuario(correo, "Dueno", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        u.setEmpresa(e);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.save(new MiembroEmpresa(u, e, "PROPIETARIO"));
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, e.getId(), e.getSlug());
    }
}
