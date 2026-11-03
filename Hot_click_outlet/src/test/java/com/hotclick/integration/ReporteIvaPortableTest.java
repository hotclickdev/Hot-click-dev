package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.FinanzasReporteService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Área 7 (Auditor 2): GET /api/admin/finanzas/reporte-iva respondía 500 para el PROPIETARIO.
 * Causa: las consultas nativas usaban {@code DATE(columna)}, que existe en PostgreSQL pero no en H2
 * (donde corren la suite y las instancias de QA): "Function DATE not found". Se cambió a
 * {@code CAST(columna AS date)}, estándar y válido en ambos motores.
 *
 * Corre en CI sobre H2. Contra PostgreSQL real (verificación manual): mismo test con
 * -Dspring.datasource.url=jdbc:postgresql://... -Dspring.datasource.username=... -Dspring.datasource.driver-class-name=org.postgresql.Driver
 * -Dspring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect -Dspring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
 */
@DisplayName("Área 7 | reporte-iva: consultas nativas portables (sin DATE())")
class ReporteIvaPortableTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private FinanzasReporteService finanzasReporteService;

    private Empresa empresa;
    private String tokenDueno;

    @BeforeEach
    void setUp() {
        Plan plan = new Plan();
        plan.setNombre("REPIVA_REPORTES");
        plan.setTieneReportes(true);
        plan = planRepository.saveAndFlush(plan);

        empresa = new Empresa();
        empresa.setNombreEmpresa("Reporte IVA Portable");
        empresa.setSlug("reporte-iva-portable");
        empresa.setCorreoEmpresa("reporte-iva-portable@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa.setPlan(plan);
        empresa = empresaRepository.saveAndFlush(empresa);

        Bodega b = new Bodega();
        b.setNombreBodega("Bodega Rep IVA");
        b.setDireccionExacta("Calle 1");
        b.setTelefono("22223333");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        Bodega bodega = bodegaRepository.saveAndFlush(b);

        // Entregado hoy: con impuesto confirmado (aplica_impuesto) y otro sin él (IVA estimado = 13/113).
        crear(bodega, "ORD-RIVA-1", LocalDateTime.now(), 11300, 1300, true);
        crear(bodega, "ORD-RIVA-2", LocalDateTime.now(), 11300, 0, false);
        // Fuera del rango consultado.
        crear(bodega, "ORD-RIVA-3", LocalDateTime.now().minusYears(2), 5000, 0, false);

        jdbcTemplate.update("INSERT INTO hot_click_orden_compra_tb (numero_orden, fk_id_empresa, fecha_orden, "
            + "fecha_recepcion, estado, total) VALUES (?, ?, ?, ?, 'RECIBIDA', 7000)",
            "OC-RIVA-1", empresa.getId(), LocalDateTime.now(), LocalDateTime.now());

        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario dueno = crearUsuario("riva-dueno@test.cr", "PROPIETARIO", rolEmp);
        dueno.setEmpresa(empresa);
        dueno = usuarioRepository.saveAndFlush(dueno);
        miembroEmpresaRepository.save(new MiembroEmpresa(dueno, empresa, "PROPIETARIO"));
        tokenDueno = "Bearer " + jwtUtil.generateToken(dueno.getCorreo(), dueno.getId(), Constants.ROL_EMPRENDEDOR,
            empresa.getId(), empresa.getSlug());
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM hot_click_orden_compra_tb");
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
        planRepository.deleteAll();
    }

    @Test
    @DisplayName("KPIs: corre sin DATE(), con y sin rango, y suma bien el IVA y las compras")
    void kpisSinRangoYConRango() {
        Map<String, Object> todo = finanzasReporteService.calcularKpis(empresa.getId(), null, null);
        assertThat(todo.get("cantidadVentas")).isEqualTo(3L);

        String hoy = java.time.LocalDate.now().toString();
        Map<String, Object> hoyKpis = finanzasReporteService.calcularKpis(empresa.getId(), hoy, hoy);
        assertThat(hoyKpis.get("cantidadVentas")).isEqualTo(2L);
        assertThat(hoyKpis.get("ventasTotales")).isEqualTo(22600L);
        assertThat(hoyKpis.get("ivaRecaudado")).isEqualTo(1300L);
        assertThat(hoyKpis.get("ivaEstimado")).isEqualTo(2600L);   // 2 × round(11300 × 13 / 113)
        assertThat(hoyKpis.get("comprasRecibidas")).isEqualTo(7000L);

        Map<String, Object> futuro = finanzasReporteService.calcularKpis(empresa.getId(), "2999-01-01", null);
        assertThat(futuro.get("cantidadVentas")).isEqualTo(0L);
        assertThat(futuro.get("comprasRecibidas")).isEqualTo(0L);
    }

    @Test
    @DisplayName("Detalle (CSV): la fecha sale como fecha y respeta el rango")
    void detalleRespetaRango() {
        String hoy = java.time.LocalDate.now().toString();
        List<Object[]> filas = pedidoRepository.reporteIvaDetalle(empresa.getId(), hoy, hoy);
        assertThat(filas).hasSize(2);
        assertThat(filas.get(0)[0].toString()).isEqualTo(hoy);
        assertThat(pedidoRepository.reporteIvaDetalle(empresa.getId(), null, null)).hasSize(3);
    }

    @Test
    @DisplayName("GET reporte-iva como PROPIETARIO con plan de reportes: 200 (antes 500) en JSON y en CSV")
    void propietarioRecibe200() throws Exception {
        String hoy = java.time.LocalDate.now().toString();
        var json = mockMvc.perform(get("/api/admin/finanzas/reporte-iva")
                .param("fechaInicio", hoy).param("fechaFin", hoy)
                .header("Authorization", tokenDueno).accept(MediaType.APPLICATION_JSON)).andReturn().getResponse();
        assertThat(json.getStatus()).as(json.getContentAsString()).isEqualTo(200);
        assertThat(json.getContentAsString()).contains("\"cantidadVentas\":2");

        var csv = mockMvc.perform(get("/api/admin/finanzas/reporte-iva")
                .param("download", "true").header("Authorization", tokenDueno)).andReturn().getResponse();
        assertThat(csv.getStatus()).isEqualTo(200);
        assertThat(csv.getContentAsString()).contains("ORD-RIVA-1").contains("ORD-RIVA-3");
    }

    private void crear(Bodega bodega, String numero, LocalDateTime fecha, int total, int iva, boolean aplica) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setFechaPedido(fecha);
        p.setEstadoPedido(Constants.PEDIDO_ENTREGADO);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(total);
        p.setTotalPedido(total);
        p.setCostoTotalProductos(total / 2);
        p.setUtilidadBruta(total - total / 2);
        p.setMetodoPago("SINPE");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(iva);
        p.setAplicaImpuesto(aplica);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        p.setEsPrueba(false);
        pedidoRepository.saveAndFlush(p);
    }
}
