package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SuscripcionPlanSupport — degradar a EMPRENDEDOR")
class SuscripcionPlanSupportDegradarTest {

    @Mock private PlanRepository planRepo;
    @Mock private EmpresaRepository empresaRepo;
    @Mock private CacheManager cacheManager;

    @InjectMocks private SuscripcionPlanSupport support;

    @BeforeEach
    void wire() {
        ReflectionTestUtils.setField(support, "planRepo", planRepo);
        ReflectionTestUtils.setField(support, "empresaRepo", empresaRepo);
        ReflectionTestUtils.setField(support, "cacheManager", cacheManager);
    }

    @Test
    @DisplayName("degradarAFree busca EMPRENDEDOR no FREE")
    void degradarUsaEmprendedor() {
        Plan plan = new Plan();
        plan.setNombre("EMPRENDEDOR");
        when(planRepo.findByNombre("EMPRENDEDOR")).thenReturn(Optional.of(plan));
        when(empresaRepo.save(any(Empresa.class))).thenAnswer(inv -> inv.getArgument(0));

        Empresa empresa = new Empresa();
        empresa.setId(3L);
        support.degradarAFree(empresa);

        assertThat(empresa.getPlan()).isSameAs(plan);
        assertThat(empresa.getPlanSaas()).isEqualTo("EMPRENDEDOR");
        assertThat(empresa.getEstadoPlan()).isEqualTo("VENCIDO");
        verify(planRepo).findByNombre("EMPRENDEDOR");
    }
}
