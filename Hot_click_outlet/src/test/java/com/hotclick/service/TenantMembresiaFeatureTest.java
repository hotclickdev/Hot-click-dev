package com.hotclick.service;

import com.hotclick.exception.PlanLimitException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.tenant.TenantInfoBuilder;
import com.hotclick.service.tenant.TenantLimitChecker;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("REQUIERE_MEMBRESIA no tiene funciones de pago hasta que la membresía está activa")
class TenantMembresiaFeatureTest {

    @Mock EmpresaRepository empresaRepo;
    @Mock ProductoRepository productoRepo;
    @Mock UsuarioRepository usuarioRepo;
    @Mock BodegaRepository bodegaRepo;
    @Mock FeatureFlagService flagService;
    @Mock TenantInfoBuilder infoBuilder;

    @AfterEach
    void limpia() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("tieneFeature es false aunque el plan y un flag digan que sí; VENCIDO sigue bloqueado")
    void bloqueaFeatures() {
        Plan plan = new Plan();
        plan.setTienePos(true);
        Empresa empresa = new Empresa();
        empresa.setPlan(plan);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        when(empresaRepo.findById(7L)).thenReturn(Optional.of(empresa));
        when(flagService.isEnabled("pos", 7L)).thenReturn(true);
        TenantService service = servicio();
        TenantContext.set(7L);

        assertThat(service.tieneFeature("pos")).isFalse();

        empresa.setEstadoPlan("VENCIDO");
        assertThat(service.tieneFeature("pos")).isFalse();

        empresa.setEstadoPlan("ACTIVO");
        assertThat(service.tieneFeature("pos")).isTrue();
    }

    @Test
    @DisplayName("verificarFeature rechaza la función de pago y no toca un plan ya activo")
    void verificarFeature() {
        Empresa empresa = new Empresa();
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        Plan plan = new Plan();
        plan.setNombre("PYME");
        plan.setTieneCrm(true);
        empresa.setPlan(plan);
        when(empresaRepo.findById(7L)).thenReturn(Optional.of(empresa));
        TenantLimitChecker limites = new TenantLimitChecker(empresaRepo);

        assertThatThrownBy(() -> limites.verificarFeature(7L, "crm"))
            .isInstanceOf(PlanLimitException.class);

        empresa.setEstadoPlan("ACTIVO");
        limites.verificarFeature(7L, "crm");
    }

    private TenantService servicio() {
        return new TenantService(empresaRepo, productoRepo, usuarioRepo, bodegaRepo, flagService, infoBuilder,
            new TenantLimitChecker(empresaRepo));
    }
}
