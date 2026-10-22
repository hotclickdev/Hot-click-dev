package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.AggregatorService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Planes 22-oct (V185): 9 / 7,5 / 6 % y sin mínimo por venta")
class PlanesTilopayTest extends BaseIntegrationTest {

    @Autowired private PlanRepository planRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private AggregatorService aggregatorService;

    @AfterEach
    void limpiar() { empresaRepository.findAll().stream().filter(e -> e.getSlug().startsWith("planes-t-")).forEach(empresaRepository::delete); }

    @Test
    void planesSembradosConMontosDecididos() {
        Plan emp = planRepository.findByNombre("EMPRENDEDOR").orElseThrow();
        Plan pyme = planRepository.findByNombre("PYME").orElseThrow();
        Plan plus = planRepository.findByNombre("NEGOCIO_PLUS").orElseThrow();
        assertThat(emp.getPrecioMensual()).isZero();
        assertThat(emp.getComisionPorcentaje()).isEqualByComparingTo("9");
        assertThat(pyme.getPrecioMensual()).isEqualTo(12900);
        assertThat(pyme.getComisionPorcentaje()).isEqualByComparingTo("7.5");
        assertThat(plus.getPrecioMensual()).isEqualTo(28900);
        assertThat(plus.getComisionPorcentaje()).isEqualByComparingTo("6");
        assertThat(emp.getComisionMinimaCrc()).isZero();
        assertThat(pyme.getComisionMinimaCrc()).isZero();
        assertThat(plus.getComisionMinimaCrc()).isZero();
    }

    @Test
    void sinMinimoPorVentaYComisionSinTopeEnPlus() {
        Empresa pyme = empresa("planes-t-pyme", "PYME");
        Empresa plus = empresa("planes-t-plus", "NEGOCIO_PLUS");
        // 7,5% de ₡5.000 = ₡375, sin piso
        var detPyme = aggregatorService.detalleParaEmpresa(pyme.getId(), 5_000);
        assertThat(detPyme.resultado().totalComision()).isEqualTo(375);
        assertThat(detPyme.minimo()).isZero();
        // sin tope: 6% de ₡10.000.000 = ₡600.000
        assertThat(aggregatorService.detalleParaEmpresa(plus.getId(), 10_000_000).resultado().totalComision()).isEqualTo(600_000);
        Empresa emp = empresa("planes-t-emp", "EMPRENDEDOR");
        assertThat(aggregatorService.detalleParaEmpresa(emp.getId(), 100_000).resultado().totalComision()).isEqualTo(9_000);
        // venta chica: 9% de ₡1.000 = ₡90, antes subía a ₡700
        assertThat(aggregatorService.detalleParaEmpresa(emp.getId(), 1_000).resultado().totalComision()).isEqualTo(90);
    }

    @Test
    void emprendedorIncluyeCajaPos() throws Exception {
        // Auditoría §1: POS en todos los planes (DataSeeder + V174). features.pos sale de tiene_pos.
        Plan emp = planRepository.findByNombre("EMPRENDEDOR").orElseThrow();
        assertThat(emp.getTienePos()).isTrue();
        assertThat(emp.getMaxCajas()).isEqualTo(1);
        String sql = new String(getClass().getResourceAsStream("/db/migration/V174__emprendedor_incluye_pos.sql").readAllBytes());
        assertThat(sql).contains("tiene_pos = TRUE").contains("nombre = 'EMPRENDEDOR'");
    }

    @Test
    void migracionV185SinMinimo() throws Exception {
        String sql = new String(getClass().getResourceAsStream("/db/migration/V185__planes_comision_sin_minimo.sql").readAllBytes());
        assertThat(sql).contains("comision_porcentaje = 7.50").contains("comision_porcentaje = 6.00")
            .contains("comision_minima_crc = 0").doesNotContainIgnoringCase("DROP");
    }

    private Empresa empresa(String slug, String plan) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        e.setPlan(planRepository.findByNombre(plan).orElseThrow());
        e.setPlanSaas(plan);
        return empresaRepository.saveAndFlush(e);
    }
}
