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

    private void reservaDevuelve(int filas, Integer posicion) {
        when(jdbc.update(contains("usados = usados + 1"), any(Object[].class))).thenReturn(filas);
        if (posicion != null) {
            when(jdbc.queryForObject(contains("SELECT usados"), eq(Integer.class))).thenReturn(posicion);
        }
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
    @DisplayName("Reserva atómica asigna trial Emprendedor de 90 días (no plan gratis permanente)")
    void reservaExitosaEsGratis() {
        stubPlan();
        reservaDevuelve(1, 1);
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(1, 70));

        Empresa empresa = new Empresa();
        ResultadoAltaCupo alta = service.aplicarAlta(empresa, "tienda@correo.com");

        assertThat(alta.cupoGratis()).isTrue();
        assertThat(alta.demo()).isFalse();
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
        assertThat(empresa.getPlanSaas()).isEqualTo("EMPRENDEDOR");
        LocalDate esperado = LocalDate.now(Constants.ZONA_CR).plusDays(90);
        assertThat(empresa.getTrialEmprendedorHasta()).isEqualTo(esperado);
        assertThat(empresa.getTrialHasta()).isEqualTo(esperado);
        assertThat(empresa.getTrialEmprendedorPos()).isEqualTo(1);
    }

    @Test
    @DisplayName("Los días del trial salen de la configuración, no del código")
    void diasDelTrialConfigurables() {
        stubPlan();
        service = servicio(70, 30);
        reservaDevuelve(1, 5);
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(5, 70));

        Empresa empresa = new Empresa();
        service.aplicarAlta(empresa, "tienda@correo.com");

        assertThat(empresa.getTrialEmprendedorHasta()).isEqualTo(LocalDate.now(Constants.ZONA_CR).plusDays(30));
        assertThat(empresa.getTrialEmprendedorPos()).isEqualTo(5);
    }

    @Test
    @DisplayName("El tope del contador sale de la configuración (UPDATE condicionado con cupo y límite)")
    void topeConfigurable() {
        service = servicio(10, 90);
        when(jdbc.update(contains("usados < ?"), eq(10), eq(10))).thenReturn(0);

        assertThat(service.reservarCupoGratis().isPresent()).isFalse();
        verify(jdbc, never()).queryForObject(contains("SELECT usados"), eq(Integer.class));
    }

    @Test
    @DisplayName("Cupo 0 (trial apagado): nadie entra con trial")
    void cupoCeroNadieEntra() {
        stubPlan();
        service = servicio(0, 90);
        when(jdbc.update(contains("usados < ?"), eq(0), eq(0))).thenReturn(0);
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(3, 0));

        Empresa empresa = new Empresa();
        service.aplicarAlta(empresa, "nueva@correo.com");

        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        assertThat(empresa.getTrialEmprendedorPos()).isNull();
    }

    @Test
    @DisplayName("Fail-closed: si la BD falla al reservar, no hay trial")
    void errorDeBdNoRegalaTrial() {
        stubPlan();
        when(jdbc.update(contains("usados = usados + 1"), any(Object[].class)))
            .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("bd caída"));
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(3, 70));

        Empresa empresa = new Empresa();
        ResultadoAltaCupo alta = service.aplicarAlta(empresa, "nueva@correo.com");

        assertThat(alta.cupoGratis()).isFalse();
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        assertThat(empresa.getTrialEmprendedorPos()).isNull();
        assertThat(empresa.getVisibilidadPublica()).isFalse();
    }

    @Test
    @DisplayName("Cupo lleno (negocio 71+): fail-closed, nunca entra gratis ni visible")
    void cupoLlenoNuncaEntraGratis() {
        stubPlan();
        reservaDevuelve(0, null);
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(70, 70));

        Empresa empresa = new Empresa();
        service.aplicarAlta(empresa, "nueva@correo.com");

        assertThat(empresa.getEstadoPlan()).isNotEqualTo("ACTIVO").isNotEqualTo(Constants.ESTADO_PLAN_TRIAL);
        assertThat(empresa.getTrialEmprendedorPos()).isNull();
        assertThat(empresa.getVisibilidadPublica()).isNotEqualTo(Boolean.TRUE);
    }

    @Test
    @DisplayName("Cupo lleno con mensualidad fijada: requiere membresía")
    void cupoLlenoRequiereMembresia() {
        stubPlan();
        reservaDevuelve(0, null);
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
