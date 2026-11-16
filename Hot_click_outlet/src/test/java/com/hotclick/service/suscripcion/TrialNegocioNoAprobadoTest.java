package com.hotclick.service.suscripcion;

import com.hotclick.controller.SuscripcionController;
import com.hotclick.exception.EmpresaPendienteAprobacionException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.security.TenantContext;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.OnvoService;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Riesgos 15-nov: un negocio no aprobado (RECHAZADO, PENDIENTE, etc.) no inicia trial ni cambia plan: 409, sin escrituras. */
class TrialNegocioNoAprobadoTest {

    @AfterEach void limpiar() { TenantContext.clear(); }

    private static Empresa empresa(String estado) {
        Empresa e = new Empresa();
        e.setId(7L);
        e.setEstadoEmpresa(estado);
        return e;
    }

    @ParameterizedTest
    @ValueSource(strings = {"RECHAZADO", "PENDIENTE_APROBACION", "INACTIVO", "BLOQUEADO", "SUSPENDIDO"})
    void iniciarTrial_noAprobado_409SinEscrituras(String estado) {
        SuscripcionRepository subRepo = mock(SuscripcionRepository.class);
        EmpresaRepository empRepo = mock(EmpresaRepository.class);
        PlanRepository planRepo = mock(PlanRepository.class);
        SuscripcionBillingService billing = new SuscripcionBillingService();
        org.springframework.test.util.ReflectionTestUtils.setField(billing, "suscripcionRepo", subRepo);
        org.springframework.test.util.ReflectionTestUtils.setField(billing, "empresaRepo", empRepo);
        org.springframework.test.util.ReflectionTestUtils.setField(billing, "planRepo", planRepo);
        when(empRepo.findById(7L)).thenReturn(Optional.of(empresa(estado)));

        assertThatThrownBy(() -> billing.iniciarTrial(7L)).isInstanceOf(EmpresaPendienteAprobacionException.class);
        verify(subRepo, never()).save(any());
        verify(empRepo, never()).save(any());
        verifyNoInteractions(planRepo);
    }

    @ParameterizedTest
    @ValueSource(strings = {"RECHAZADO", "INACTIVO", "BLOQUEADO", "SUSPENDIDO"})
    void cambiarPlan_noAprobado_409SinTocarOnvo(String estado) {
        EmpresaRepository empRepo = mock(EmpresaRepository.class);
        OnvoBillingClient onvo = mock(OnvoBillingClient.class);
        SuscripcionRepository subRepo = mock(SuscripcionRepository.class);
        SuscripcionOnvoChangeService svc = new SuscripcionOnvoChangeService(
            subRepo, empRepo, mock(PlanRepository.class), onvo, mock(OnvoService.class),
            mock(SuscripcionPlanSupport.class), null);
        when(empRepo.findById(7L)).thenReturn(Optional.of(empresa(estado)));

        assertThatThrownBy(() -> svc.cambiarPlan(7L, 2L)).isInstanceOf(EmpresaPendienteAprobacionException.class);
        verifyNoInteractions(onvo);
        verify(subRepo, never()).findActivaByEmpresaId(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"RECHAZADO", "PENDIENTE_APROBACION", "INACTIVO"})
    void controllerTrial_409ConCodigoSinFiltrarDatos(String estado) {
        SuscripcionService svc = mock(SuscripcionService.class);
        PropietarioGuard guard = mock(PropietarioGuard.class);
        when(guard.puedeGestionarEmpresa(7L)).thenReturn(true);
        when(svc.iniciarTrial(7L)).thenThrow(new EmpresaPendienteAprobacionException());
        SuscripcionController c = new SuscripcionController(svc, mock(PlanRepository.class), null, null, null, guard);
        TenantContext.set(7L);

        ResponseEntity<Map<String, Object>> r = c.iniciarTrial();
        assertThat(r.getStatusCode().value()).isEqualTo(409);
        assertThat(r.getBody()).containsOnlyKeys("error", "codigo");
        assertThat(r.getBody()).containsEntry("codigo", "EMPRESA_PENDIENTE_APROBACION");
    }

    @Test
    void iniciarTrial_activo_sigueFuncionando() {
        SuscripcionRepository subRepo = mock(SuscripcionRepository.class);
        EmpresaRepository empRepo = mock(EmpresaRepository.class);
        SuscripcionBillingService billing = new SuscripcionBillingService();
        org.springframework.test.util.ReflectionTestUtils.setField(billing, "suscripcionRepo", subRepo);
        org.springframework.test.util.ReflectionTestUtils.setField(billing, "empresaRepo", empRepo);
        com.hotclick.model.Suscripcion existente = new com.hotclick.model.Suscripcion();
        when(empRepo.findById(7L)).thenReturn(Optional.of(empresa("ACTIVO")));
        when(subRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.of(existente));

        assertThat(billing.iniciarTrial(7L)).isSameAs(existente);
    }
}
