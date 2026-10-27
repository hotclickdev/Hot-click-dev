package com.hotclick.service;

import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CupoEmprendedorService")
class CupoEmprendedorServiceTest {

    @Mock JdbcTemplate jdbc;
    @Mock PlanRepository planRepository;

    CupoEmprendedorService service;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        service = servicio(70, 90);
    }

    private CupoEmprendedorService servicio(int cupo, int dias) {
        return new CupoEmprendedorService(jdbc, planRepository, new TrialEmprendedorConfig(cupo, dias));
    }

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
    @DisplayName("El alta NO toma puesto ni arranca el trial: queda PENDIENTE_CUPO, oculto, sin tocar el contador")
    void altaQuedaPendienteSinConsumirCupo() {
        stubPlan();
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(3, 70));

        Empresa empresa = new Empresa();
        ResultadoAltaCupo alta = service.aplicarAlta(empresa, "tienda@correo.com");

        assertThat(alta.pendienteCupo()).isTrue();
        assertThat(alta.cupoGratis()).isFalse();
        assertThat(alta.demo()).isFalse();
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        assertThat(empresa.getPlanSaas()).isEqualTo("EMPRENDEDOR");
        assertThat(empresa.getVisibilidadPublica()).isFalse();
        assertThat(empresa.getTrialEmprendedorPos()).isNull();
        assertThat(empresa.getTrialEmprendedorHasta()).isNull();
        assertThat(empresa.getTrialHasta()).isNull();
        assertThat(empresa.getFechaVencPlan()).isNull();
        // Ningún UPDATE: ni reserva ni lock del contador durante el registro.
        verify(jdbc, never()).update(anyString(), any(Object[].class));
        verify(jdbc, never()).update(anyString());
    }

    @Test
    @DisplayName("aplicarTrial cuenta los días desde hoy (la aprobación) y salen de la configuración")
    void trialCuentaDesdeLaAprobacionConDiasConfigurables() {
        stubPlan();
        service = servicio(70, 30);
        Empresa empresa = new Empresa();
        service.aplicarTrial(empresa);

        LocalDate esperado = LocalDate.now(Constants.ZONA_CR).plusDays(30);
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
        assertThat(empresa.getTrialEmprendedorHasta()).isEqualTo(esperado);
        assertThat(empresa.getTrialHasta()).isEqualTo(esperado);
        assertThat(empresa.getFechaVencPlan()).isEqualTo(esperado);
    }

    @Test
    @DisplayName("Sin puesto: REQUIERE_MEMBRESIA, oculto y sin trial")
    void sinPuestoRequiereMembresia() {
        stubPlan();
        Empresa empresa = new Empresa();
        service.aplicarRequiereMembresia(empresa);

        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        assertThat(empresa.getVisibilidadPublica()).isFalse();
        assertThat(empresa.getTrialEmprendedorPos()).isNull();
        assertThat(empresa.getTrialEmprendedorHasta()).isNull();
    }

    @Test
    @DisplayName("Fail-closed: si la BD falla al reservar, no hay puesto")
    void errorDeBdNoRegalaPuesto() {
        when(jdbc.update(contains("usados = usados"))).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("bd caída"));

        Empresa empresa = new Empresa();
        empresa.setId(5L);
        assertThat(service.reservarPuesto(empresa, 9L, "a@b.com"))
            .isEqualTo(CupoEmprendedorService.ResultadoReserva.SIN_CUPO);
        assertThat(empresa.getTrialEmprendedorPos()).isNull();
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
        assertThat(alta.pendienteCupo()).isFalse();
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
