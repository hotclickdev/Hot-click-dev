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
            var envField = SuscripcionOnvoChangeService.class.getDeclaredField("environment");
            envField.setAccessible(true);
            var env = new org.springframework.mock.env.MockEnvironment();
            env.setActiveProfiles("test");
            envField.set(service, env);
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
        // QA8: el plan actual se resuelve por repo (el proxy LAZY no se inicializa fuera de sesión).
        org.mockito.Mockito.lenient().when(planRepo.findById(1L)).thenReturn(Optional.of(planEmprendedor));
    }

    @Test
    @DisplayName("QA8: plan actual como proxy LAZY sin sesión no rompe el cambio de plan")
    void planActualProxyLazySinSesion() {
        Plan proxy = org.mockito.Mockito.mock(Plan.class);
        when(proxy.getId()).thenReturn(1L);
        org.mockito.Mockito.lenient().when(proxy.getNombre()).thenThrow(
            new org.hibernate.LazyInitializationException("Could not initialize proxy [com.hotclick.model.Plan#1] - no session"));
        empresa.setPlan(proxy);
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));

        // Mismo plan: se detecta por el nombre leído del repo, sin tocar el proxy.
        assertThatThrownBy(() -> service.cambiarPlan(10L, 1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Ya tenés el plan");
        verify(proxy, never()).getNombre();
    }

    @Test
    @DisplayName("QA8: negocio PENDIENTE_APROBACION no elige ni paga plan (sin llamar a ONVO)")
    void empresaPendienteAprobacionNoPaga() {
        empresa.setEstadoEmpresa("PENDIENTE_APROBACION");
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));

        assertThatThrownBy(() -> service.cambiarPlan(10L, 2L))
            .isInstanceOf(com.hotclick.exception.EmpresaPendienteAprobacionException.class);
        verify(onvoBilling, never()).crearCustomer(any(), any(), anyMap());
        verify(suscripcionRepo, never()).findActivaByEmpresaId(any());
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
    @DisplayName("PAG-6: perfil prod/default + secreto vacío → error 400 y plan sin cambio")
    void mockFueraDeDevTestFallaCerrado() throws Exception {
        for (String[] perfiles : new String[][] { {}, {"prod"} }) {
            var env = new org.springframework.mock.env.MockEnvironment();
            env.setActiveProfiles(perfiles);
            var envField = SuscripcionOnvoChangeService.class.getDeclaredField("environment");
            envField.setAccessible(true);
            envField.set(service, env);
            when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
            when(planRepo.findById(2L)).thenReturn(Optional.of(planPyme));
            when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());
            when(onvoBilling.isMockMode()).thenReturn(true);

            org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.cambiarPlan(10L, 2L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Pagos no configurados")
                .hasNoCause();
        }
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
        verify(empresaRepo, never()).save(any());
        verify(suscripcionRepo, never()).save(any());
    }

    @Test
    @DisplayName("Prod sin llave (isMockMode=false, sinLlave=true) → no toma camino mock ni llama a ONVO")
    void prodSinLlaveFallaCerrado() throws Exception {
        var env = new org.springframework.mock.env.MockEnvironment();
        env.setActiveProfiles("production");
        var envField = SuscripcionOnvoChangeService.class.getDeclaredField("environment");
        envField.setAccessible(true);
        envField.set(service, env);
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        when(planRepo.findById(2L)).thenReturn(Optional.of(planPyme));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());
        when(onvoBilling.isMockMode()).thenReturn(false);
        when(onvoBilling.sinLlave()).thenReturn(true);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.cambiarPlan(10L, 2L))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("Pagos no configurados");
        verify(onvoBilling, never()).crearCustomer(any(), any(), anyMap());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
        verify(empresaRepo, never()).save(any());
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

    @Test
    @DisplayName("PAG-6: dev+prod / dev+production no permiten mock; dev o test solos sí")
    void mockPermitidoExigePerfilEstricto() throws Exception {
        var envField = SuscripcionOnvoChangeService.class.getDeclaredField("environment");
        envField.setAccessible(true);
        for (String[] perfiles : new String[][] {{"dev", "prod"}, {"dev", "production"}, {"test", "prod"}, {},
                {"dev", "PROD"}, {"test", "Production"}}) {
            var env = new org.springframework.mock.env.MockEnvironment();
            env.setActiveProfiles(perfiles);
            envField.set(service, env);
            assertThat(service.mockPermitido()).as(String.join("+", perfiles)).isFalse();
        }
        for (String perfil : new String[] {"dev", "test"}) {
            var env = new org.springframework.mock.env.MockEnvironment();
            env.setActiveProfiles(perfil);
            envField.set(service, env);
            assertThat(service.mockPermitido()).as(perfil).isTrue();
        }
    }

    private Suscripcion prepararBajaConSubOnvo() {
        empresa.setPlan(planPyme);
        empresa.setPlanSaas("PYME");
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(empresa);
        sub.setEstado("ACTIVA");
        sub.setOnvoSubscriptionId("sub_real_l210");
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        when(planRepo.findById(1L)).thenReturn(Optional.of(planEmprendedor));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(sub));
        return sub;
    }

    @Test
    @DisplayName("L210: ONVO responde canceled → suscripción local CANCELADO y empresa en Emprendedor")
    void bajaGratis_onvoCanceled_actualizaEstadoLocal() {
        Suscripcion sub = prepararBajaConSubOnvo();
        when(onvoBilling.cancelarAlVencer("sub_real_l210"))
            .thenReturn(OnvoBillingClient.ResultadoCancelacion.CANCELADA);
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_real_l210")).thenReturn(Optional.of(sub));
        when(planRepo.findByNombre("EMPRENDEDOR")).thenReturn(Optional.of(planEmprendedor));

        Map<String, Object> r = service.cambiarPlan(10L, 1L);

        assertThat(r.get("status")).isEqualTo("cancelado");
        assertThat(sub.getEstado()).isEqualTo("CANCELADO");
        assertThat(sub.getFechaCancelacion()).isNotNull();
        assertThat(empresa.getPlanSaas()).isEqualTo("EMPRENDEDOR");
        assertThat(sub.getCancelarAlVencer()).isNotEqualTo(Boolean.TRUE);
    }

    @Test
    @DisplayName("L210: ONVO confirma cancelAtPeriodEnd → solo se marca cancelarAlVencer")
    void bajaGratis_programada_marcaAlVencer() {
        Suscripcion sub = prepararBajaConSubOnvo();
        when(onvoBilling.cancelarAlVencer("sub_real_l210"))
            .thenReturn(OnvoBillingClient.ResultadoCancelacion.PROGRAMADA);

        Map<String, Object> r = service.cambiarPlan(10L, 1L);

        assertThat(r.get("status")).isEqualTo("pendiente_ciclo");
        assertThat(sub.getCancelarAlVencer()).isTrue();
        assertThat(sub.getEstado()).isEqualTo("ACTIVA");
    }

    @Test
    @DisplayName("L210: sin resultado de ONVO → excepción y el estado local no cambia (fail-closed)")
    void bajaGratis_sinResultado_failClosed() {
        Suscripcion sub = prepararBajaConSubOnvo();
        when(onvoBilling.cancelarAlVencer("sub_real_l210")).thenReturn(null);

        assertThatThrownBy(() -> service.cambiarPlan(10L, 1L)).isInstanceOf(IllegalStateException.class);
        assertThat(sub.getEstado()).isEqualTo("ACTIVA");
        assertThat(sub.getCancelarAlVencer()).isNotEqualTo(Boolean.TRUE);
        verify(suscripcionRepo, never()).save(any());
    }

    @Test
    @DisplayName("Seguridad #333: suspendida que elige plan gratis sigue SUSPENDIDO_IMPAGO y sin mes nuevo")
    void suspendidaNoSaleBajandoAGratis() {
        empresa.setEstadoPlan("VENCIDO");
        empresa.setEstadoEmpresa(com.hotclick.utils.Constants.ESTADO_EMPRESA_SUSPENDIDO_IMPAGO);
        java.time.LocalDate venc = java.time.LocalDate.of(2026, 10, 1);
        empresa.setFechaVencPlan(venc);
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        org.mockito.Mockito.lenient().when(planRepo.findById(1L)).thenReturn(Optional.of(planEmprendedor));

        assertThatThrownBy(() -> service.cambiarPlan(10L, 1L))
            .isInstanceOf(IllegalStateException.class);

        assertThat(empresa.getEstadoEmpresa()).isEqualTo("SUSPENDIDO_IMPAGO");
        assertThat(empresa.getFechaVencPlan()).isEqualTo(venc);
        verify(suscripcionRepo, never()).save(any());
        verify(empresaRepo, never()).save(any());
    }

    @Test
    @DisplayName("aplicarPlanLocal (sin pago) no reactiva; planPagoConfirmado sí")
    void soloPagoConfirmadoReactiva() {
        empresa.setEstadoEmpresa("SUSPENDIDO_IMPAGO");
        when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(planPyme));
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());

        service.aplicarPlanLocal(10L, "PYME", null);
        assertThat(empresa.getEstadoEmpresa()).isEqualTo("SUSPENDIDO_IMPAGO");

        service.planPagoConfirmado(10L, "PYME", "ONVO", "ref");
        assertThat(empresa.getEstadoEmpresa()).isEqualTo("ACTIVO");
    }

    @Test
    @DisplayName("Mock de pago apagado fuera de dev/test (prod o sin perfil)")
    void mockApagadoFueraDeDevTest() throws Exception {
        var envField = SuscripcionOnvoChangeService.class.getDeclaredField("environment");
        envField.setAccessible(true);
        for (String[] perfiles : new String[][]{{}, {"prod"}, {"dev", "PROD"}, {"test", "production"}}) {
            var env = new org.springframework.mock.env.MockEnvironment();
            env.setActiveProfiles(perfiles);
            envField.set(service, env);
            assertThat(service.mockPermitido()).as(String.join(",", perfiles)).isFalse();
        }
    }

    @Test
    @DisplayName("Suspendida no cambia a un plan de pago por /cambiar-plan")
    void suspendidaNoCambiaDePlan() {
        empresa.setEstadoEmpresa("SUSPENDIDO_IMPAGO");
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        assertThatThrownBy(() -> service.cambiarPlan(10L, 2L)).isInstanceOf(IllegalStateException.class);
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
        assertThat(empresa.getEstadoEmpresa()).isEqualTo("SUSPENDIDO_IMPAGO");
    }

    @Test
    @DisplayName("Pago confirmado por otro proveedor (Tilopay) no reactiva")
    void tilopayNoReactiva() {
        empresa.setEstadoEmpresa("SUSPENDIDO_IMPAGO");
        when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(planPyme));
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());
        service.planPagoConfirmado(10L, "PYME", "TILOPAY", "ord-1");
        assertThat(empresa.getEstadoEmpresa()).isEqualTo("SUSPENDIDO_IMPAGO");
    }

    @Test
    @DisplayName("(d) webhook ONVO de pago confirmado reactiva la tienda suspendida")
    void webhookOnvoReactiva() {
        empresa.setEstadoEmpresa("SUSPENDIDO_IMPAGO");
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(empresa);
        sub.setPlan(planPyme);
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_1")).thenReturn(Optional.of(sub));
        when(planRepo.findById(2L)).thenReturn(Optional.of(planPyme));
        service.procesarPagoOnvoExitoso(10L, "sub_1", 2L);
        assertThat(empresa.getEstadoEmpresa()).isEqualTo("ACTIVO");
        assertThat(empresa.getPlanSaas()).isEqualTo("PYME");
    }

    @Test
    @DisplayName("Monto pendiente sale del plan impago (tabla plan), no de un valor fijo")
    void montoPendienteDelPlanVencido() {
        planPyme.setPrecioMensual(12345);
        Suscripcion vencida = new Suscripcion();
        vencida.setPlan(planPyme);
        when(suscripcionRepo.findTopByEmpresaIdAndEstadoOrderByFechaCreacionDesc(10L, "VENCIDO"))
            .thenReturn(Optional.of(vencida));
        assertThat(service.planPendienteDeSuspension(10L)).get()
            .extracting(Plan::getPrecioMensual).isEqualTo(12345);
    }

    @Test
    @DisplayName("pagarSuspension solo aplica a tiendas suspendidas")
    void pagarSoloSuspendida() {
        empresa.setEstadoEmpresa("ACTIVO");
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        assertThatThrownBy(() -> service.pagarSuspension(10L)).isInstanceOf(IllegalStateException.class);
    }
}
