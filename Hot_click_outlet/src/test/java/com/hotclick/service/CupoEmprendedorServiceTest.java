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
    @Mock com.hotclick.repository.SuscripcionRepository suscripcionRepository;

    CupoEmprendedorService service;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        service = servicio(70, 90);
    }

    private CupoEmprendedorService servicio(int cupo, int dias) {
        return servicio(cupo, dias, null, false);
    }

    private CupoEmprendedorService servicio(int cupo, int dias, org.springframework.core.env.Environment env,
                                            boolean flagDemo) {
        return new CupoEmprendedorService(jdbc, planRepository, new TrialEmprendedorConfig(cupo, dias),
            suscripcionRepository, env, flagDemo);
    }

    private static org.springframework.core.env.Environment env(String... perfiles) {
        org.springframework.mock.env.MockEnvironment e = new org.springframework.mock.env.MockEnvironment();
        e.setActiveProfiles(perfiles);
        return e;
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
    @DisplayName("Fail-closed: si la BD falla al reservar no hay puesto y se lanza un error claro (409), no SIN_CUPO")
    void errorDeBdNoRegalaPuesto() {
        when(jdbc.update(contains("usados = usados"))).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("bd caída"));

        Empresa empresa = new Empresa();
        empresa.setId(5L);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.reservarPuesto(empresa, 9L, "a@b.com"))
            .isInstanceOf(com.hotclick.exception.CupoEmprendedorNoDisponibleException.class);
        assertThat(empresa.getTrialEmprendedorPos()).isNull();
    }

    @Test
    @DisplayName("L1: el log no lleva el mensaje de la excepción (puede traer el correo del UNIQUE)")
    void logSoloConElTipoDeLaExcepcion() {
        String correo = "persona.privada@correo.com";
        when(jdbc.update(contains("usados = usados"))).thenThrow(
            new org.springframework.dao.DuplicateKeyException("duplicate key (trial_emprendedor_titular_correo)=(" + correo + ")"));
        ch.qos.logback.classic.Logger logger =
            (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(CupoEmprendedorService.class);
        ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> appender =
            new ch.qos.logback.core.read.ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            Empresa empresa = new Empresa();
            empresa.setId(5L);
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.reservarPuesto(empresa, 9L, correo))
                .isInstanceOf(com.hotclick.exception.CupoEmprendedorNoDisponibleException.class)
                .hasMessageNotContaining(correo);
            assertThat(appender.list).isNotEmpty();
            assertThat(appender.list).allSatisfy(ev -> {
                assertThat(ev.getFormattedMessage()).doesNotContain(correo).contains("DuplicateKeyException");
                assertThat(ev.getThrowableProxy()).isNull();
            });
        } finally {
            logger.detachAppender(appender);
        }
    }

    @Test
    @DisplayName("L3: puesto heredado + persona con otro puesto + suscripción vigente: NO se libera")
    void noLiberaPuestoHeredadoConSuscripcionVigente() {
        when(jdbc.update(contains("usados = usados"))).thenReturn(1);
        when(jdbc.queryForObject(contains("COUNT(*)"), eq(Integer.class), any(), any(), any())).thenReturn(1);
        when(suscripcionRepository.findActivaByEmpresaId(5L)).thenReturn(Optional.of(new com.hotclick.model.Suscripcion()));

        Empresa empresa = new Empresa();
        empresa.setId(5L);
        empresa.setTrialEmprendedorPos(3);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);

        assertThat(service.reservarPuesto(empresa, 9L, "a@b.com"))
            .isEqualTo(CupoEmprendedorService.ResultadoReserva.PUESTO_CONSERVADO_CON_SUSCRIPCION);
        verify(jdbc, never()).update(contains("estado_plan = 'PENDIENTE_CUPO'"), any(Object[].class));
        verify(jdbc, never()).update(contains("usados - 1"));
        assertThat(empresa.getTrialEmprendedorPos()).isEqualTo(3);
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
    }

    @Test
    @DisplayName("L3: puesto heredado + persona con otro puesto + SIN suscripción: se libera como antes")
    void liberaPuestoHeredadoSinSuscripcion() {
        when(jdbc.update(contains("usados = usados"))).thenReturn(1);
        when(jdbc.queryForObject(contains("COUNT(*)"), eq(Integer.class), any(), any(), any())).thenReturn(1);
        when(suscripcionRepository.findActivaByEmpresaId(5L)).thenReturn(Optional.empty());
        when(jdbc.update(contains("estado_plan = 'PENDIENTE_CUPO'"), eq(5L))).thenReturn(1);

        Empresa empresa = new Empresa();
        empresa.setId(5L);
        empresa.setTrialEmprendedorPos(3);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);

        assertThat(service.reservarPuesto(empresa, 9L, "a@b.com"))
            .isEqualTo(CupoEmprendedorService.ResultadoReserva.PERSONA_YA_TIENE_PUESTO);
        assertThat(empresa.getTrialEmprendedorPos()).isNull();
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
    }

    @Test
    @DisplayName("Correos demo QA no consumen cupo, solo con flag explícito y perfil dev/test")
    void demoNoConsumeCupo() {
        stubPlan();
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(5, 70));
        CupoEmprendedorService conFlag = servicio(70, 90, env("test"), true);
        Empresa empresa = new Empresa();
        ResultadoAltaCupo alta = conFlag.aplicarAlta(empresa, "qa.pyme.demo@hotclick.test");

        assertThat(alta.demo()).isTrue();
        assertThat(alta.cupoGratis()).isTrue();
        assertThat(alta.pendienteCupo()).isFalse();
        assertThat(empresa.getEstadoPlan()).isEqualTo("ACTIVO");
        assertThat(conFlag.esDemo("qa.negocioplus.demo@hotclick.test")).isTrue();
        assertThat(conFlag.esDemo("real@gmail.com")).isFalse();
        assertThat(servicio(70, 90, env("dev"), true).esDemo("x@hotclick.test")).isTrue();
    }

    @Test
    @DisplayName("esDemo fail-closed: sin flag, sin entorno, prod/production (cualquier mayúscula), staging o sin perfil")
    void esDemoFailClosed() {
        String demo = "x@hotclick.test";
        assertThat(servicio(70, 90, env("test"), false).esDemo(demo)).isFalse();      // sin flag
        assertThat(servicio(70, 90, null, true).esDemo(demo)).isFalse();              // sin entorno
        assertThat(servicio(70, 90, env("prod"), true).esDemo(demo)).isFalse();
        assertThat(servicio(70, 90, env("production"), true).esDemo(demo)).isFalse();
        assertThat(servicio(70, 90, env("test", "prod"), true).esDemo(demo)).isFalse();
        assertThat(servicio(70, 90, env("dev", "PROD"), true).esDemo(demo)).isFalse();
        assertThat(servicio(70, 90, env("staging"), true).esDemo(demo)).isFalse();
        assertThat(servicio(70, 90, env(), true).esDemo(demo)).isFalse();             // sin perfil activo
        assertThat(servicio(70, 90, env("test"), true).esDemo(null)).isFalse();
    }

    @Test
    @DisplayName("En prod, un correo @hotclick.test va por la ruta normal: PENDIENTE_CUPO, sin plan gratis ni puesto")
    void aplicarAltaEnProdNoRegalaPlan() {
        stubPlan();
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(5, 70));
        Empresa empresa = new Empresa();

        ResultadoAltaCupo alta = servicio(70, 90, env("prod"), true).aplicarAlta(empresa, "Cualquiera@HotClick.Test");

        assertThat(alta.demo()).isFalse();
        assertThat(alta.cupoGratis()).isFalse();
        assertThat(alta.pendienteCupo()).isTrue();
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        assertThat(empresa.getTrialEmprendedorPos()).isNull();
        verify(jdbc, never()).update(anyString());
    }

    private void stubPlan() {
        Plan plan = new Plan();
        plan.setNombre("EMPRENDEDOR");
        when(planRepository.findByNombre(eq("EMPRENDEDOR"))).thenReturn(Optional.of(plan));
    }
}
