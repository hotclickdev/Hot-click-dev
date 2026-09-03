package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Cambio de plan ONVO")
class SuscripcionOnvoChangeServiceTest {

    @Mock SuscripcionRepository suscripcionRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock PlanRepository planRepo;
    @Mock OnvoBillingClient onvoBilling;
    @Mock OnvoService onvoService;
    @Mock SuscripcionPlanSupport planSupport;

    SuscripcionOnvoChangeService service;

    Empresa empresa;
    Plan planEmprendedor;
    Plan planPyme;

    @BeforeEach
    void setUp() {
        service = new SuscripcionOnvoChangeService(
            suscripcionRepo, empresaRepo, planRepo, onvoBilling, onvoService, planSupport, null);
        // self-proxy: in unit tests call through same instance for @Transactional methods
        try {
            var field = SuscripcionOnvoChangeService.class.getDeclaredField("self");
            field.setAccessible(true);
            field.set(service, service);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }

        empresa = new Empresa();
        empresa.setId(10L);
        empresa.setNombreEmpresa("Demo");
        empresa.setCorreoEmpresa("demo@test.com");
        empresa.setPlanSaas("EMPRENDEDOR");

        planEmprendedor = new Plan();
        planEmprendedor.setId(1L);
        planEmprendedor.setNombre("EMPRENDEDOR");

        planPyme = new Plan();
        planPyme.setId(2L);
        planPyme.setNombre("PYME");

        empresa.setPlan(planEmprendedor);
    }

    @Test
    @DisplayName("Mismo plan → IllegalArgumentException")
    void mismoPlanRechaza() {
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        when(planRepo.findById(1L)).thenReturn(Optional.of(planEmprendedor));

        assertThatThrownBy(() -> service.cambiarPlan(10L, 1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Ya tenés el plan");
    }

    @Test
    @DisplayName("Stripe activo → IllegalStateException")
    void stripeActivoBloquea() {
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(empresa);
        sub.setPlan(planEmprendedor);
        sub.setStripeSubscriptionId("sub_live_abc");

        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        when(planRepo.findById(2L)).thenReturn(Optional.of(planPyme));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(sub));

        assertThatThrownBy(() -> service.cambiarPlan(10L, 2L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Stripe");
    }

    @Test
    @DisplayName("Mock ONVO activa PYME al instante")
    void mockActivaPlan() {
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        when(planRepo.findById(2L)).thenReturn(Optional.of(planPyme));
        when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(planPyme));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());
        when(onvoBilling.isMockMode()).thenReturn(true);
        when(onvoBilling.getPriceIdForPlan("PYME")).thenReturn(null);
        when(onvoBilling.crearCustomer(any(), any(), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoCustomer("cus_mock"));
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_mock"), any(), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_mock", "item_mock"));
        when(suscripcionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(empresaRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> out = service.cambiarPlan(10L, 2L);

        assertThat(out.get("status")).isEqualTo("activado");
        assertThat(out.get("planNombre")).isEqualTo("PYME");
        assertThat(out.get("mock")).isEqualTo(true);
        verify(onvoService, never()).getPublishableKey();
    }

    @Test
    @DisplayName("Sin mock pide pago con subscriptionId")
    void requierePagoConSubscriptionId() {
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        when(planRepo.findById(2L)).thenReturn(Optional.of(planPyme));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());
        when(onvoBilling.isMockMode()).thenReturn(false);
        when(onvoBilling.getPriceIdForPlan("PYME")).thenReturn("price_pyme");
        when(onvoBilling.crearCustomer(any(), any(), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoCustomer("cus_real"));
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_real"), eq("price_pyme"), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_real", "item_1"));
        when(onvoService.getPublishableKey()).thenReturn("pk_test");
        when(suscripcionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> out = service.cambiarPlan(10L, 2L);

        assertThat(out.get("status")).isEqualTo("requiere_pago");
        assertThat(out.get("subscriptionId")).isEqualTo("sub_real");
        assertThat(out.get("publishableKey")).isEqualTo("pk_test");
        assertThat(empresa.getPlan().getNombre()).isEqualTo("EMPRENDEDOR");
    }
}
