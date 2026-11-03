package com.hotclick.service.suscripcion;

import com.hotclick.exception.PlanYaActivoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FacturaSaasRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Regresión QA3-023 / QA3-P01 / QA3-022 (suscripciones 01-nov). */
class SuscripcionPlanPendienteQa3Test {

    private static Plan plan(long id, String nombre) {
        Plan p = new Plan();
        p.setId(id);
        p.setNombre(nombre);
        return p;
    }

    @Test
    void qa3_023_cambioSinPagoDejaPlanVigenteYNuevoPendiente() {
        Plan plus = plan(3L, "NEGOCIO_PLUS");
        Plan pyme = plan(2L, "PYME");
        Suscripcion sub = new Suscripcion();
        sub.setPlan(plus);
        SuscripcionOnvoChangeService.registrarPlanPendiente(sub, pyme);
        assertThat(sub.getPlan()).isSameAs(plus);
        assertThat(sub.getPlanPendiente()).isSameAs(pyme);

        // Repagar el mismo plan no deja pendiente.
        SuscripcionOnvoChangeService.registrarPlanPendiente(sub, plan(3L, "NEGOCIO_PLUS"));
        assertThat(sub.getPlanPendiente()).isNull();
    }

    @Test
    void qa3_023_infoExponeVigenteYPendiente() {
        SuscripcionRepository repo = mock(SuscripcionRepository.class);
        Suscripcion sub = new Suscripcion();
        sub.setPlan(plan(1L, "EMPRENDEDOR"));
        sub.setPlanPendiente(plan(3L, "NEGOCIO_PLUS"));
        when(repo.findActivaByEmpresaId(11L)).thenReturn(Optional.of(sub));
        SuscripcionQueryService q = new SuscripcionQueryService();
        ReflectionTestUtils.setField(q, "suscripcionRepo", repo);
        ReflectionTestUtils.setField(q, "facturaRepo", mock(FacturaSaasRepository.class));

        Map<String, Object> info = q.getSuscripcionInfo(11L);
        assertThat(info.get("planNombre")).isEqualTo("EMPRENDEDOR");
        assertThat(info.get("planPendienteNombre")).isEqualTo("NEGOCIO_PLUS");
    }

    @Test
    void qa3_p01_sinSuscripcionMuestraPlanRealDelNegocio() {
        SuscripcionRepository repo = mock(SuscripcionRepository.class);
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        when(repo.findActivaByEmpresaId(13L)).thenReturn(Optional.empty());
        Empresa e = new Empresa();
        e.setId(13L);
        e.setPlan(plan(3L, "NEGOCIO_PLUS"));
        when(empresas.findById(13L)).thenReturn(Optional.of(e));
        SuscripcionQueryService q = new SuscripcionQueryService();
        ReflectionTestUtils.setField(q, "suscripcionRepo", repo);
        ReflectionTestUtils.setField(q, "empresaRepo", empresas);
        ReflectionTestUtils.setField(q, "planRepo", mock(PlanRepository.class));

        Map<String, Object> info = q.getSuscripcionInfo(13L);
        assertThat(info.get("planNombre")).isEqualTo("NEGOCIO_PLUS");
        assertThat(info.get("planId")).isEqualTo(3L);
    }

    @Test
    void qa3_022_planYaActivoTieneCodigoClaro() {
        PlanYaActivoException ex = new PlanYaActivoException("NEGOCIO_PLUS");
        assertThat(ex).isInstanceOf(IllegalArgumentException.class);
        assertThat(PlanYaActivoException.CODIGO).isEqualTo("PLAN_YA_ACTIVO");
    }
}
