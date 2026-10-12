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

@DisplayName("Planes 12-oct: montos desde configuración y mínimo ₡700 en los tres planes")
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
        assertThat(pyme.getComisionPorcentaje()).isEqualByComparingTo("7");
        assertThat(plus.getPrecioMensual()).isEqualTo(28900);
        assertThat(plus.getComisionPorcentaje()).isEqualByComparingTo("7");
        assertThat(emp.getComisionMinimaCrc()).isEqualTo(700);
        assertThat(pyme.getComisionMinimaCrc()).isEqualTo(700);
        assertThat(plus.getComisionMinimaCrc()).isEqualTo(700);
    }

    @Test
    void minimoDe700TambienEnPymeYComisionSinTopeEnPlus() {
        Empresa pyme = empresa("planes-t-pyme", "PYME");
        Empresa plus = empresa("planes-t-plus", "NEGOCIO_PLUS");
        // 7% de ₡5.000 = ₡350 < mínimo ₡700
        assertThat(aggregatorService.detalleParaEmpresa(pyme.getId(), 5_000).resultado().totalComision()).isEqualTo(700);
        // sin tope: 7% de ₡10.000.000 = ₡700.000
        assertThat(aggregatorService.detalleParaEmpresa(plus.getId(), 10_000_000).resultado().totalComision()).isEqualTo(700_000);
        Empresa emp = empresa("planes-t-emp", "EMPRENDEDOR");
        assertThat(aggregatorService.detalleParaEmpresa(emp.getId(), 100_000).resultado().totalComision()).isEqualTo(9_000);
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
