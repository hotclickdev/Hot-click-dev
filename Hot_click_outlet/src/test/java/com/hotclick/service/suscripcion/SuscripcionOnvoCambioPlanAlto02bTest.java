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

import java.util.List;
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
@DisplayName("[ONVO] ALTO-02b cambio de plan y completar pago")
class SuscripcionOnvoCambioPlanAlto02bTest {

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
        // M1: el alta ONVO toma el lock de fila del negocio.
        org.mockito.Mockito.lenient().when(empresaRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(empresa));
    }

    Suscripcion sub;

    /** Caso QA: empresa con suscripción ONVO incomplete cuyo ítem ya está en el price de PYME. */
    private void conSuscripcionOnvo(String estado, String priceEnOnvo, String paymentMethodId) {
        sub = new Suscripcion();
        sub.setEmpresa(empresa);
        sub.setPlan(planEmprendedor);
        sub.setOnvoSubscriptionId("sub_vieja");
        sub.setOnvoCustomerId("cus_1");
        sub.setOnvoPriceId(priceEnOnvo);
        org.mockito.Mockito.lenient().when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(sub));
        org.mockito.Mockito.lenient().when(suscripcionRepo.findActivasByEmpresaId(10L)).thenReturn(List.of(sub));
        org.mockito.Mockito.lenient().when(suscripcionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        org.mockito.Mockito.lenient().when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        org.mockito.Mockito.lenient().when(planRepo.findById(2L)).thenReturn(Optional.of(planPyme));
        org.mockito.Mockito.lenient().when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(planPyme));
        org.mockito.Mockito.lenient().when(onvoBilling.isMockMode()).thenReturn(false);
        org.mockito.Mockito.lenient().when(onvoBilling.getPriceIdForPlan("PYME")).thenReturn("price_pyme");
        org.mockito.Mockito.lenient().when(onvoService.getPublishableKey()).thenReturn("pk_test");
        Map<String, Object> enOnvo = new java.util.HashMap<>();
        enOnvo.put("id", "sub_vieja");
        enOnvo.put("status", estado);
        enOnvo.put("items", List.of(Map.of("id", "si_1", "price", Map.of("id", priceEnOnvo))));
        if (paymentMethodId != null) enOnvo.put("paymentMethodId", paymentMethodId);
        org.mockito.Mockito.lenient().doReturn(enOnvo).when(onvoBilling).obtenerSuscripcion("sub_vieja");
    }

    @Test
    @DisplayName("Price ya pedido + incomplete: no repite cambios en ONVO y devuelve el cobro pendiente")
    void mismoPrice_incomplete_requierePagoSinCambios() {
        conSuscripcionOnvo("incomplete", "price_pyme", null);

        Map<String, Object> out = service.cambiarPlan(10L, 2L);

        assertThat(out.get("status")).isEqualTo("requiere_pago");
        assertThat(out.get("subscriptionId")).isEqualTo("sub_vieja");
        assertThat(out.get("planNombre")).isEqualTo("PYME");
        verify(onvoBilling, never()).cancelarInmediato(any());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
        assertThat(empresa.getPlan().getNombre()).isEqualTo("EMPRENDEDOR");
    }

    @Test
    @DisplayName("Price ya pedido + activa con método de pago: no hay cobro pendiente ni llamadas de cambio")
    void mismoPrice_activa_sinCobro() {
        conSuscripcionOnvo("active", "price_pyme", "pm_1");

        Map<String, Object> out = service.cambiarPlan(10L, 2L);

        assertThat(out.get("status")).isEqualTo("actualizando");
        verify(onvoBilling, never()).cancelarInmediato(any());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
    }

    @Test
    @DisplayName("Otro price + incomplete (nunca cobrada): PRIMERO crea la nueva, la guarda y DESPUÉS cancela la vieja")
    void otroPrice_incomplete_reemplaza() {
        conSuscripcionOnvo("incomplete", "price_emp", null);
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_pyme"), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_nueva", "si_2"));

        Map<String, Object> out = service.cambiarPlan(10L, 2L);

        org.mockito.InOrder orden = org.mockito.Mockito.inOrder(onvoBilling, suscripcionRepo);
        orden.verify(onvoBilling).crearSuscripcionIncompleta(eq("cus_1"), eq("price_pyme"), anyMap());
        orden.verify(suscripcionRepo).save(sub);
        orden.verify(onvoBilling).cancelarInmediato("sub_vieja");
        assertThat(out.get("status")).isEqualTo("requiere_pago");
        assertThat(out.get("subscriptionId")).isEqualTo("sub_nueva");
        assertThat(sub.getOnvoSubscriptionId()).isEqualTo("sub_nueva");
        assertThat(sub.getOnvoPriceId()).isEqualTo("price_pyme");
        assertThat(sub.getOnvoSubPorCancelar()).isNull();
        assertThat(out).doesNotContainKey("trialDias");
    }

    @Test
    @DisplayName("Reemplazo: ONVO rechaza la nueva → 422, la vieja no se cancela y nada local cambia")
    void reemplazo_creacionRechazada_viejaIntacta() {
        conSuscripcionOnvo("incomplete", "price_emp", null);
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_pyme"), anyMap()))
            .thenThrow(new com.hotclick.exception.OnvoSolicitudRechazadaException("400", null));

        assertThatThrownBy(() -> service.cambiarPlan(10L, 2L))
            .isInstanceOf(com.hotclick.exception.OnvoSolicitudRechazadaException.class);
        verify(onvoBilling, never()).cancelarInmediato(any());
        verify(suscripcionRepo, never()).save(any());
        assertThat(sub.getOnvoSubscriptionId()).isEqualTo("sub_vieja");
        assertThat(sub.getOnvoPriceId()).isEqualTo("price_emp");
        assertThat(sub.getPlanPendiente()).isNull();
    }

    @Test
    @DisplayName("Reemplazo: ONVO no responde al crear → 503 en voseo, la vieja no se cancela y nada local cambia")
    void reemplazo_creacionSinRespuesta_viejaIntacta() {
        conSuscripcionOnvo("incomplete", "price_emp", null);
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_pyme"), anyMap()))
            .thenThrow(new org.springframework.web.client.ResourceAccessException("timeout"));

        assertThatThrownBy(() -> service.cambiarPlan(10L, 2L))
            .isInstanceOf(com.hotclick.exception.ReemplazoOnvoNoDisponibleException.class);
        assertThat(com.hotclick.exception.ReemplazoOnvoNoDisponibleException.MENSAJE)
            .contains("no cambiamos tu plan").contains("no se te cobró nada").contains("Probá");
        verify(onvoBilling, never()).cancelarInmediato(any());
        verify(suscripcionRepo, never()).save(any());
        assertThat(sub.getOnvoSubscriptionId()).isEqualTo("sub_vieja");
    }

    @Test
    @DisplayName("Reemplazo: falla el guardado de la nueva → se cancela la nueva (huérfana), nunca la vieja")
    void reemplazo_guardadoFalla_cancelaSoloLaNueva() {
        conSuscripcionOnvo("incomplete", "price_emp", null);
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_pyme"), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_nueva", "si_2"));
        org.mockito.Mockito.doThrow(new org.springframework.dao.DataIntegrityViolationException("x"))
            .when(suscripcionRepo).save(any());

        assertThatThrownBy(() -> service.cambiarPlan(10L, 2L))
            .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        verify(onvoBilling).cancelarInmediato("sub_nueva");
        verify(onvoBilling, never()).cancelarInmediato("sub_vieja");
    }

    @Test
    @DisplayName("Reemplazo: falla cancelar la vieja → la fila apunta a la nueva y la vieja queda marcada para revisión")
    void reemplazo_cancelarViejaFalla_marcaRevisionManual() {
        conSuscripcionOnvo("incomplete", "price_emp", null);
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_pyme"), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_nueva", "si_2"));
        org.mockito.Mockito.doThrow(new IllegalStateException("onvo 500"))
            .when(onvoBilling).cancelarInmediato("sub_vieja");

        Map<String, Object> out = service.cambiarPlan(10L, 2L);

        assertThat(out.get("status")).isEqualTo("requiere_pago");
        assertThat(out.get("subscriptionId")).isEqualTo("sub_nueva");
        assertThat(sub.getOnvoSubscriptionId()).isEqualTo("sub_nueva");
        assertThat(sub.getOnvoSubPorCancelar()).isEqualTo("sub_vieja");
        assertThat(sub.getOnvoRevisionManualDesde()).isNotNull();
    }

    @Test
    @DisplayName("Seguridad: trialing con método de pago → 422 en voseo, sin tocar ONVO ni el estado local")
    void trialingConMetodoPago_noSeReemplaza() {
        conSuscripcionOnvo("trialing", "price_emp", "pm_1");

        assertThatThrownBy(() -> service.cambiarPlan(10L, 2L))
            .isInstanceOf(com.hotclick.exception.TrialConMetodoPagoException.class);
        assertThat(com.hotclick.exception.TrialConMetodoPagoException.MENSAJE)
            .contains("Tu plan sigue igual").contains("no se te cobró nada").contains("escribinos");
        verify(onvoBilling, never()).cancelarInmediato(any());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), org.mockito.ArgumentMatchers.anyInt());
        verify(suscripcionRepo, never()).save(any());
        assertThat(sub.getOnvoSubscriptionId()).isEqualTo("sub_vieja");
        assertThat(sub.getOnvoPriceId()).isEqualTo("price_emp");
        assertThat(sub.getPlanPendiente()).isNull();
    }

    @Test
    @DisplayName("Log enmascarado: solo los últimos 4 caracteres del id")
    void enmascarar() {
        assertThat(SuscripcionOnvoChangeService.enmascarar("sub_abcdef123456")).isEqualTo("****3456");
        assertThat(SuscripcionOnvoChangeService.enmascarar("abc")).isEqualTo("****");
        assertThat(SuscripcionOnvoChangeService.enmascarar(null)).isEqualTo("****");
    }

    @Test
    @DisplayName("Reemplazo en trialing: manda trialPeriodDays con los días que le quedan según trialEnd de ONVO")
    void reemplazo_trialing_conservaDiasDeOnvo() {
        conSuscripcionOnvo("trialing", "price_emp", null);
        @SuppressWarnings("unchecked") Map<String, Object> enOnvo = new java.util.HashMap<>((Map<String, Object>) onvoBilling.obtenerSuscripcion("sub_vieja"));
        enOnvo.put("trialEnd", java.time.Instant.now().plus(java.time.Duration.ofDays(12)).plusSeconds(3600).toString());
        org.mockito.Mockito.doReturn(enOnvo).when(onvoBilling).obtenerSuscripcion("sub_vieja");
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_pyme"), anyMap(), eq(12)))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_nueva", "si_2"));

        Map<String, Object> out = service.cambiarPlan(10L, 2L);

        assertThat(out.get("trialDias")).isEqualTo(12);
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
        verify(onvoBilling).cancelarInmediato("sub_vieja");
    }

    @Test
    @DisplayName("Días de trial: hacia abajo, mínimo 0; sin trialEnd en ONVO se usa la fecha local")
    void diasTrialRestantes_redondeoYFallback() {
        java.time.Instant ahora = java.time.Instant.parse("2026-11-04T12:00:00Z");
        assertThat(SuscripcionOnvoChangeService.diasTrialRestantes(
            Map.of("trialEnd", "2026-11-07T11:59:59Z"), empresa, null, ahora)).isEqualTo(2);
        assertThat(SuscripcionOnvoChangeService.diasTrialRestantes(
            Map.of("trialEnd", "2026-11-01T00:00:00Z"), empresa, null, ahora)).isZero();
        Suscripcion local = new Suscripcion();
        local.setTrialEnd(java.time.LocalDate.of(2026, 11, 14));
        assertThat(SuscripcionOnvoChangeService.diasTrialRestantes(Map.of(), empresa, local, ahora)).isEqualTo(10);
        assertThat(SuscripcionOnvoChangeService.diasTrialRestantes(
            Map.of("trialEnd", "no-es-fecha"), empresa, local, ahora)).isEqualTo(10);
        assertThat(SuscripcionOnvoChangeService.diasTrialRestantes(null, empresa, null, ahora)).isZero();
    }

    @Test
    @DisplayName("Otro price + activa (ya cobrada): falla cerrado con 422, sin cancelar ni crear nada")
    void otroPrice_activa_failClosed() {
        conSuscripcionOnvo("active", "price_emp", "pm_1");

        assertThatThrownBy(() -> service.cambiarPlan(10L, 2L))
            .isInstanceOf(com.hotclick.exception.OnvoSolicitudRechazadaException.class);
        verify(onvoBilling, never()).cancelarInmediato(any());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
        assertThat(sub.getOnvoSubscriptionId()).isEqualTo("sub_vieja");
    }

    @Test
    @DisplayName("Falta ONVO_PRICE_ID del plan: falla cerrado con mensaje en voseo, sin llamar a ONVO")
    void faltaPriceId_failClosed() {
        conSuscripcionOnvo("incomplete", "price_pyme", null);
        when(onvoBilling.getPriceIdForPlan("PYME")).thenReturn(null);

        assertThatThrownBy(() -> service.cambiarPlan(10L, 2L))
            .isInstanceOf(com.hotclick.exception.PriceIdOnvoFaltanteException.class);
        assertThat(com.hotclick.exception.PriceIdOnvoFaltanteException.MENSAJE)
            .contains("No se te cobró nada").contains("Escribinos");
        verify(onvoBilling, never()).obtenerSuscripcion(any());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
    }

    @Test
    @DisplayName("Completar pago con suscripción incomplete: datos para el SDK con el plan que dice ONVO")
    void completarPago_incomplete() {
        conSuscripcionOnvo("incomplete", "price_pyme", null);
        when(onvoBilling.planParaPriceId("price_pyme")).thenReturn("PYME");

        Map<String, Object> out = service.completarPago(10L);

        assertThat(out.get("status")).isEqualTo("requiere_pago");
        assertThat(out.get("subscriptionId")).isEqualTo("sub_vieja");
        assertThat(out.get("customerId")).isEqualTo("cus_1");
        assertThat(out.get("planNombre")).isEqualTo("PYME");
        verify(onvoBilling, never()).cancelarInmediato(any());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
    }

    @Test
    @DisplayName("Completar pago con trial sin método de pago: también abre el SDK")
    void completarPago_trialSinMetodo() {
        conSuscripcionOnvo("trialing", "price_pyme", null);
        when(onvoBilling.planParaPriceId("price_pyme")).thenReturn("PYME");

        assertThat(service.completarPago(10L).get("status")).isEqualTo("requiere_pago");
    }

    @Test
    @DisplayName("Completar pago con suscripción activa: sin_pago_pendiente")
    void completarPago_activa() {
        conSuscripcionOnvo("active", "price_pyme", "pm_1");

        assertThat(service.completarPago(10L).get("status")).isEqualTo("sin_pago_pendiente");
    }

    @Test
    @DisplayName("Completar pago con price desconocido: falla cerrado")
    void completarPago_priceDesconocido() {
        conSuscripcionOnvo("incomplete", "price_raro", null);
        when(onvoBilling.planParaPriceId("price_raro")).thenReturn(null);

        assertThatThrownBy(() -> service.completarPago(10L)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Completar pago sin suscripción ONVO: sin_pago_pendiente sin llamar a ONVO")
    void completarPago_sinOnvo() {
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());

        assertThat(service.completarPago(10L).get("status")).isEqualTo("sin_pago_pendiente");
        verify(onvoBilling, never()).obtenerSuscripcion(any());
    }
}
