package com.hotclick.service.tenant;

import com.hotclick.controller.CrmController;
import com.hotclick.controller.crm.CrmAccessGuard;
import com.hotclick.exception.PlanLimitException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.CrmClientesService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@DisplayName("SEG-E | el backend respeta lo que incluye cada plan")
class PlanFeaturesSegETest {

    private static TenantLimitChecker checker(int maxBodegas, boolean pos) {
        Plan plan = new Plan();
        plan.setNombre("X");
        plan.setMaxBodegas(maxBodegas);
        plan.setTienePos(pos);
        Empresa e = new Empresa();
        e.setId(52L);
        e.setPlan(plan);
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findById(52L)).thenReturn(Optional.of(e));
        return new TenantLimitChecker(repo);
    }

    @Test
    void sucursalesSoloConPlanMultiUbicacion() {
        assertThatThrownBy(() -> checker(1, true).verificarFeature(52L, "sucursales")).isInstanceOf(PlanLimitException.class);
        assertThatCode(() -> checker(2, true).verificarFeature(52L, "sucursales")).doesNotThrowAnyException();
        assertThatCode(() -> checker(-1, true).verificarFeature(52L, "sucursales")).doesNotThrowAnyException();
    }

    @Test
    void crmListarDa403SinFeature() {
        CrmController c = new CrmController();
        CrmAccessGuard guard = mock(CrmAccessGuard.class);
        when(guard.sinAccesoCrm()).thenReturn(true);
        CrmClientesService svc = mock(CrmClientesService.class);
        ReflectionTestUtils.setField(c, "crmAccessGuard", guard);
        ReflectionTestUtils.setField(c, "crmClientesService", svc);
        assertThat(c.listar().getStatusCode().value()).isEqualTo(403);
        assertThat(c.getById(1L).getStatusCode().value()).isEqualTo(403);
        verifyNoInteractions(svc);
    }
}
