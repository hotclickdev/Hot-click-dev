package com.hotclick.service;

import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CupoEmprendedorService")
class CupoEmprendedorServiceTest {

    @Mock JdbcTemplate jdbc;
    @Mock PlanRepository planRepository;

    @InjectMocks CupoEmprendedorService service;

    @Test
    @DisplayName("estadoPublico lee usados y calcula disponibles")
    void estadoPublicoLeeFila() {
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(12, 70));

        CupoEmprendedorEstado estado = service.estadoPublico();
        assertThat(estado.usados()).isEqualTo(12);
        assertThat(estado.limite()).isEqualTo(70);
        assertThat(estado.cuposGratisDisponibles()).isEqualTo(58);
        assertThat(estado.hayCupoGratis()).isTrue();
    }

    @Test
    @DisplayName("Si no hay tabla, el cupo se trata como lleno")
    void tablaFaltanteCierraCupo() {
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenThrow(new EmptyResultDataAccessException(1));

        CupoEmprendedorEstado estado = service.estadoPublico();
        assertThat(estado.cuposGratisDisponibles()).isZero();
        assertThat(estado.usados()).isEqualTo(Constants.CUPO_EMPRENDEDORES_GRATIS);
    }

    @Test
    @DisplayName("Reserva atómica asigna plan gratis")
    void reservaExitosaEsGratis() {
        stubPlan();
        when(jdbc.query(contains("RETURNING usados"), any(RowMapper.class)))
            .thenReturn(List.of(1));
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(1, 70));

        Empresa empresa = new Empresa();
        ResultadoAltaCupo alta = service.aplicarAlta(empresa, "tienda@correo.com");

        assertThat(alta.cupoGratis()).isTrue();
        assertThat(alta.demo()).isFalse();
        assertThat(empresa.getEstadoPlan()).isEqualTo("ACTIVO");
        assertThat(empresa.getPlanSaas()).isEqualTo("EMPRENDEDOR");
    }

    @Test
    @DisplayName("Sin filas en RETURNING, requiere membresía")
    void cupoLlenoRequiereMembresia() {
        stubPlan();
        when(jdbc.query(contains("RETURNING usados"), any(RowMapper.class)))
            .thenReturn(List.of());
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(70, 70));

        Empresa empresa = new Empresa();
        ResultadoAltaCupo alta = service.aplicarAlta(empresa, "nueva@correo.com");

        assertThat(alta.cupoGratis()).isFalse();
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        assertThat(empresa.getVisibilidadPublica()).isFalse();
    }

    @Test
    @DisplayName("Correos demo QA no consumen cupo")
    void demoNoConsumeCupo() {
        stubPlan();
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(5, 70));
        Empresa empresa = new Empresa();
        ResultadoAltaCupo alta = service.aplicarAlta(empresa, "qa.pyme.demo@hotclick.test");

        assertThat(alta.demo()).isTrue();
        assertThat(alta.cupoGratis()).isTrue();
        assertThat(empresa.getEstadoPlan()).isEqualTo("ACTIVO");
        assertThat(CupoEmprendedorService.esDemo("qa.negocioplus.demo@hotclick.test")).isTrue();
        assertThat(CupoEmprendedorService.esDemo("real@gmail.com")).isFalse();
    }

    private void stubPlan() {
        Plan plan = new Plan();
        plan.setNombre("EMPRENDEDOR");
        when(planRepository.findByNombre(eq("EMPRENDEDOR"))).thenReturn(Optional.of(plan));
    }
}
