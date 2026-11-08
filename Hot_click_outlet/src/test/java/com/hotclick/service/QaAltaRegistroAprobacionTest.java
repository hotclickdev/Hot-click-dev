package com.hotclick.service;

import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SolicitudAprobacionRepository;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Registro y aprobación: el fixture QA no toma el trial y las demás tiendas siguen igual")
class QaAltaRegistroAprobacionTest {

    @Mock JdbcTemplate jdbc;
    @Mock PlanRepository planes;
    @Mock com.hotclick.repository.SuscripcionRepository suscripciones;
    @Mock QaAltaPymeTestService qa;

    @Test
    @DisplayName("Con la puerta abierta el fixture queda PYME a cobro, sin puesto y sin el atajo demo")
    void altaConsumePymeSinCupo() {
        when(qa.esCorreoDelFixture(anyString())).thenReturn(true);
        when(qa.consumirSiAplica(anyString())).thenReturn(true);
        when(planes.findByNombre(eq("PYME"))).thenReturn(Optional.of(plan("PYME")));
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(9, 70));

        Empresa empresa = new Empresa();
        ResultadoAltaCupo alta = cupo(true).aplicarAlta(empresa, "QA.SIM.ALTA20261108@hotclick.test");

        assertThat(alta.qaPymeCobroTest()).isTrue();
        assertThat(alta.demo()).isFalse();
        assertThat(alta.pendienteCupo()).isFalse();
        assertThat(alta.cupoGratis()).isFalse();
        assertThat(empresa.getPlanSaas()).isEqualTo("PYME");
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        assertThat(empresa.getVisibilidadPublica()).isFalse();
        assertThat(empresa.getTrialEmprendedorPos()).isNull();
        assertThat(empresa.getTrialEmprendedorHasta()).isNull();
        assertThat(empresa.getTrialHasta()).isNull();
        assertThat(empresa.getFechaVencPlan()).isNull();
        verify(jdbc, never()).update(anyString());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    @DisplayName("Puerta cerrada: el fixture no es demo y queda pendiente de cupo, como un alta real")
    void puertaCerradaSigueElTrial() {
        when(qa.esCorreoDelFixture(anyString())).thenReturn(true);
        when(qa.consumirSiAplica(anyString())).thenReturn(false);
        when(planes.findByNombre(eq("EMPRENDEDOR"))).thenReturn(Optional.of(plan("EMPRENDEDOR")));
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(9, 70));

        Empresa empresa = new Empresa();
        ResultadoAltaCupo alta = cupo(true).aplicarAlta(empresa, QaAltaPymeTestService.CORREO_FIXTURE);

        assertThat(alta.qaPymeCobroTest()).isFalse();
        assertThat(alta.demo()).isFalse();
        assertThat(alta.pendienteCupo()).isTrue();
        assertThat(empresa.getPlanSaas()).isEqualTo("EMPRENDEDOR");
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        verify(jdbc, never()).update(anyString());
    }

    @Test
    @DisplayName("Otra tienda @hotclick.test sigue el demo y no intenta consumir la concesión")
    void otraTiendaDemoNoTocaLaConcesion() {
        when(qa.esCorreoDelFixture("qa.pyme.demo@hotclick.test")).thenReturn(false);
        when(planes.findByNombre(eq("EMPRENDEDOR"))).thenReturn(Optional.of(plan("EMPRENDEDOR")));
        when(jdbc.queryForObject(contains("SELECT usados"), any(RowMapper.class)))
            .thenReturn(CupoEmprendedorEstado.of(9, 70));

        Empresa empresa = new Empresa();
        ResultadoAltaCupo alta = cupo(true).aplicarAlta(empresa, "qa.pyme.demo@hotclick.test");

        assertThat(alta.demo()).isTrue();
        assertThat(empresa.getEstadoPlan()).isEqualTo("ACTIVO");
        verify(qa, never()).consumirSiAplica(anyString());
    }

    @Test
    @DisplayName("Sin plan PYME no se deja el negocio a medias: la transacción del alta puede revertir el uso")
    void sinPlanPymeFalla() {
        when(qa.esCorreoDelFixture(anyString())).thenReturn(true);
        when(qa.consumirSiAplica(anyString())).thenReturn(true);
        when(planes.findByNombre(eq("PYME"))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cupo(false).aplicarAlta(new Empresa(), QaAltaPymeTestService.CORREO_FIXTURE))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("PYME");
    }

    @Test
    @DisplayName("Aprobar el fixture consumido no asigna trial, no publica y no cambia el plan")
    void aprobarNoAsignaTrial() {
        Empresa e = fixturePendiente();
        CupoEmprendedorAprobacionService cupoAprob = mock(CupoEmprendedorAprobacionService.class);
        when(qa.empresaConCobroPymeTest(e)).thenReturn(true);

        Empresa out = aprobar(e, cupoAprob);

        assertThat(out.getEstadoEmpresa()).isEqualTo("ACTIVO");
        assertThat(out.getVisibilidadPublica()).isFalse();
        assertThat(out.getPlanSaas()).isEqualTo("PYME");
        assertThat(out.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        assertThat(out.getTrialEmprendedorPos()).isNull();
        verify(cupoAprob, never()).resolverAlAprobar(any());
    }

    @Test
    @DisplayName("Otra tienda pendiente sigue resolviendo el cupo al aprobar")
    void otraTiendaResuelveCupo() {
        Empresa e = new Empresa();
        e.setId(3L);
        e.setCorreoEmpresa("otra@tienda.test");
        e.setPlanSaas("EMPRENDEDOR");
        e.setEstadoPlan(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        e.setEstadoEmpresa("PENDIENTE_APROBACION");
        CupoEmprendedorAprobacionService cupoAprob = mock(CupoEmprendedorAprobacionService.class);
        when(qa.empresaConCobroPymeTest(e)).thenReturn(false);
        when(cupoAprob.resolverAlAprobar(e)).thenReturn(CupoEmprendedorAprobacionService.Resultado.TRIAL_ASIGNADO);

        Empresa out = aprobar(e, cupoAprob);

        assertThat(out.getVisibilidadPublica()).isTrue();
        verify(cupoAprob).resolverAlAprobar(e);
    }

    @Test
    @DisplayName("Si no se puede leer la concesión del fixture, la aprobación no publica")
    void lecturaCaidaNoPublica() {
        Empresa e = fixturePendiente();
        when(qa.empresaConCobroPymeTest(e)).thenThrow(new IllegalStateException("No se pudo verificar la excepción QA"));
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findByIdForUpdate(8L)).thenReturn(Optional.of(e));
        EmpresaAprobacionService aprob = armar(repo, mock(CupoEmprendedorAprobacionService.class));

        assertThatThrownBy(() -> aprob.aprobarYPublicar(8L)).isInstanceOf(IllegalStateException.class);
        verify(repo, never()).save(any());
        assertThat(e.getEstadoEmpresa()).isEqualTo("PENDIENTE_APROBACION");
    }

    @Test
    @DisplayName("El vínculo exige negocio e id; un alta que no es la excepción no liga")
    void vinculo() {
        Empresa empresa = new Empresa();
        empresa.setId(8L);
        empresa.setCorreoEmpresa(QaAltaPymeTestService.CORREO_FIXTURE);
        QaAltaPymeTestVinculo.ligar(ResultadoAltaCupo.pendiente(CupoEmprendedorEstado.of(9, 70)), empresa, null);
        verify(qa, never()).vincular(any(), any());
        assertThatThrownBy(() -> QaAltaPymeTestVinculo.ligar(
            ResultadoAltaCupo.qaPymeCobroTest(CupoEmprendedorEstado.of(9, 70)), empresa, null))
            .isInstanceOf(IllegalStateException.class);
    }

    private CupoEmprendedorService cupo(boolean demo) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");
        return new CupoEmprendedorService(jdbc, planes, new TrialEmprendedorConfig(70, 90), suscripciones, env, demo, qa);
    }

    private Empresa aprobar(Empresa e, CupoEmprendedorAprobacionService cupoAprob) {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findByIdForUpdate(e.getId())).thenReturn(Optional.of(e));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        return armar(repo, cupoAprob).aprobarYPublicar(e.getId());
    }

    private EmpresaAprobacionService armar(EmpresaRepository repo, CupoEmprendedorAprobacionService cupoAprob) {
        EmpresaAprobacionService aprob = new EmpresaAprobacionService();
        ReflectionTestUtils.setField(aprob, "empresaRepository", repo);
        ReflectionTestUtils.setField(aprob, "productoRepository", mock(ProductoRepository.class));
        ReflectionTestUtils.setField(aprob, "solicitudAprobacionRepository", mock(SolicitudAprobacionRepository.class));
        ReflectionTestUtils.setField(aprob, "productoService", mock(ProductoService.class));
        ReflectionTestUtils.setField(aprob, "ubicacionDespachoService", mock(UbicacionDespachoService.class));
        ReflectionTestUtils.setField(aprob, "cupoEmprendedorAprobacionService", cupoAprob);
        ReflectionTestUtils.setField(aprob, "qaAltaPymeTest", qa);
        return aprob;
    }

    private static Empresa fixturePendiente() {
        Empresa e = new Empresa();
        e.setId(8L);
        e.setCorreoEmpresa(QaAltaPymeTestService.CORREO_FIXTURE);
        e.setPlanSaas("PYME");
        e.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        e.setEstadoEmpresa("PENDIENTE_APROBACION");
        e.setVisibilidadPublica(false);
        return e;
    }

    private static Plan plan(String nombre) {
        Plan p = new Plan();
        p.setNombre(nombre);
        return p;
    }
}
