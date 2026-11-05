package com.hotclick.service.suscripcion;

import com.hotclick.exception.CambioPlanRequiereSolicitudException;
import com.hotclick.exception.OnvoSolicitudRechazadaException;
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
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cambio de plan con la suscripción ONVO ya cobrada: solo subir a Negocio Plus es directo (precio completo hoy, sin
 * prorrateo; primero se crea la nueva y después se cancela la vieja). Lo demás responde 422 con solicitud. Un pago de
 * la suscripción vieja nunca activa ni cambia el plan.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("[ONVO] Cambio de plan con suscripción cobrada")
class SuscripcionOnvoCambioPlanCobradaTest {

    @Mock SuscripcionRepository suscripcionRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock PlanRepository planRepo;
    @Mock OnvoBillingClient onvoBilling;
    @Mock OnvoService onvoService;
    @Mock SuscripcionPlanSupport planSupport;

    SuscripcionOnvoChangeService service;
    Empresa empresa;
    Plan emprendedor;
    Plan pyme;
    Plan plus;
    Suscripcion sub;

    @BeforeEach
    void setUp() throws Exception {
        service = new SuscripcionOnvoChangeService(
            suscripcionRepo, empresaRepo, planRepo, onvoBilling, onvoService, planSupport, null);
        var f = SuscripcionOnvoChangeService.class.getDeclaredField("self");
        f.setAccessible(true);
        f.set(service, service);
        var e = SuscripcionOnvoChangeService.class.getDeclaredField("environment");
        e.setAccessible(true);
        var env = new org.springframework.mock.env.MockEnvironment();
        env.setActiveProfiles("test");
        e.set(service, env);

        emprendedor = plan(1L, "EMPRENDEDOR");
        pyme = plan(2L, "PYME");
        plus = plan(3L, "NEGOCIO_PLUS");
        empresa = new Empresa();
        empresa.setId(10L);
        empresa.setNombreEmpresa("Demo");
        empresa.setCorreoEmpresa("demo@test.com");
        for (Plan p : List.of(emprendedor, pyme, plus)) {
            lenient().when(planRepo.findById(p.getId())).thenReturn(Optional.of(p));
            lenient().when(planRepo.findByNombre(p.getNombre())).thenReturn(Optional.of(p));
        }
        lenient().when(empresaRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(empresa));
        lenient().when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        lenient().when(suscripcionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(onvoBilling.isMockMode()).thenReturn(false);
        lenient().when(onvoBilling.getPriceIdForPlan("PYME")).thenReturn("price_pyme");
        lenient().when(onvoBilling.getPriceIdForPlan("NEGOCIO_PLUS")).thenReturn("price_plus");
        lenient().when(onvoBilling.getPriceIdForPlan("EMPRENDEDOR")).thenReturn("price_emp");
        lenient().when(onvoService.getPublishableKey()).thenReturn("pk_test");
    }

    private static Plan plan(Long id, String nombre) {
        Plan p = new Plan();
        p.setId(id);
        p.setNombre(nombre);
        return p;
    }

    /** Negocio con plan vigente {@code actual} y suscripción ONVO {@code sub_vieja} en {@code estado}. */
    private void cobrada(Plan actual, String estado) {
        empresa.setPlan(actual);
        empresa.setPlanSaas(actual.getNombre());
        empresa.setEstadoPlan("ACTIVO");
        sub = new Suscripcion();
        sub.setEmpresa(empresa);
        sub.setPlan(actual);
        sub.setEstado("ACTIVO");
        sub.setFechaFin(LocalDate.now().plusDays(20));
        sub.setOnvoSubscriptionId("sub_vieja");
        sub.setOnvoCustomerId("cus_1");
        String price = "price_" + switch (actual.getNombre()) {
            case "PYME" -> "pyme"; case "NEGOCIO_PLUS" -> "plus"; default -> "emp"; };
        sub.setOnvoPriceId(price);
        lenient().when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(sub));
        lenient().when(suscripcionRepo.findActivasByEmpresaId(10L)).thenReturn(List.of(sub));
        Map<String, Object> enOnvo = new java.util.HashMap<>();
        enOnvo.put("id", "sub_vieja");
        enOnvo.put("status", estado);
        enOnvo.put("paymentMethodId", "pm_1");
        enOnvo.put("items", List.of(Map.of("id", "si_1", "price", Map.of("id", price))));
        lenient().doReturn(enOnvo).when(onvoBilling).obtenerSuscripcion("sub_vieja");
    }

    @Test
    @DisplayName("PYME→NEGOCIO_PLUS cobrada: crea la nueva SIN trial, la guarda y DESPUÉS cancela la vieja; el plan no cambia aún")
    void subida_creaYDespuesCancela_planViejoHastaElPago() {
        cobrada(pyme, "active");
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_plus"), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_nueva", "si_2"));

        Map<String, Object> out = service.cambiarPlan(10L, 3L);

        assertThat(out.get("status")).isEqualTo("requiere_pago");
        assertThat(out.get("subscriptionId")).isEqualTo("sub_nueva");
        assertThat(out.get("planNombre")).isEqualTo("NEGOCIO_PLUS");
        assertThat(out).doesNotContainKey("trialDias");
        InOrder orden = inOrder(onvoBilling, suscripcionRepo);
        orden.verify(onvoBilling).crearSuscripcionIncompleta(eq("cus_1"), eq("price_plus"), anyMap());
        orden.verify(suscripcionRepo, org.mockito.Mockito.atLeastOnce()).save(sub);
        orden.verify(onvoBilling).cancelarInmediato("sub_vieja");
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        assertThat(sub.getOnvoSubscriptionId()).isEqualTo("sub_nueva");
        assertThat(sub.getOnvoSubReemplazada()).isEqualTo("sub_vieja");
        assertThat(sub.getOnvoSubPorCancelar()).isNull();
        // Hasta que ONVO confirme el pago sigue el plan viejo.
        assertThat(sub.getPlan().getNombre()).isEqualTo("PYME");
        assertThat(sub.getPlanPendiente().getNombre()).isEqualTo("NEGOCIO_PLUS");
        assertThat(empresa.getPlan().getNombre()).isEqualTo("PYME");
    }

    @Test
    @DisplayName("EMPRENDEDOR (de pago) → NEGOCIO_PLUS también es subida directa")
    void subidaDesdeEmprendedor() {
        cobrada(emprendedor, "active");
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_plus"), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_nueva", "si_2"));

        assertThat(service.cambiarPlan(10L, 3L).get("status")).isEqualTo("requiere_pago");
        verify(onvoBilling).cancelarInmediato("sub_vieja");
    }

    @Test
    @DisplayName("Falla cancelar la vieja: queda en onvo_sub_por_cancelar (revisión manual) y no se crea otra")
    void subida_cancelacionFalla_revisionManual() {
        cobrada(pyme, "active");
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_plus"), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_nueva", "si_2"));
        org.mockito.Mockito.doThrow(new RuntimeException("500")).when(onvoBilling).cancelarInmediato("sub_vieja");

        Map<String, Object> out = service.cambiarPlan(10L, 3L);

        assertThat(out.get("status")).isEqualTo("requiere_pago");
        assertThat(sub.getOnvoSubPorCancelar()).isEqualTo("sub_vieja");
        assertThat(sub.getOnvoRevisionManualDesde()).isNotNull();
        verify(onvoBilling, org.mockito.Mockito.times(1)).crearSuscripcionIncompleta(any(), any(), anyMap());
    }

    @Test
    @DisplayName("ONVO rechaza la nueva: la vieja no se cancela y nada local cambia (sin doble cobro)")
    void subida_creacionRechazada_viejaIntacta() {
        cobrada(pyme, "active");
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_plus"), anyMap()))
            .thenThrow(new OnvoSolicitudRechazadaException("400", null));

        assertThatThrownBy(() -> service.cambiarPlan(10L, 3L)).isInstanceOf(OnvoSolicitudRechazadaException.class);
        verify(onvoBilling, never()).cancelarInmediato(any());
        assertThat(sub.getOnvoSubscriptionId()).isEqualTo("sub_vieja");
        assertThat(sub.getOnvoSubReemplazada()).isNull();
        assertThat(sub.getPlanPendiente()).isNull();
    }

    @Test
    @DisplayName("Ya hay una vieja pendiente de cancelar: no se sube (no se suma otra suscripción viva)")
    void subida_conViejaPendiente_falla() {
        cobrada(pyme, "active");
        sub.setOnvoSubPorCancelar("sub_anterior");

        assertThatThrownBy(() -> service.cambiarPlan(10L, 3L)).isInstanceOf(OnvoSolicitudRechazadaException.class)
            .isNotInstanceOf(CambioPlanRequiereSolicitudException.class);
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
        verify(onvoBilling, never()).cancelarInmediato(any());
    }

    @Test
    @DisplayName("Bajar NEGOCIO_PLUS→PYME cobrada: 422 de solicitud, sin tocar ONVO")
    void bajada_requiereSolicitud() {
        cobrada(plus, "active");
        assertThatThrownBy(() -> service.cambiarPlan(10L, 2L)).isInstanceOf(CambioPlanRequiereSolicitudException.class);
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
        verify(onvoBilling, never()).cancelarInmediato(any());
        assertThat(sub.getPlanPendiente()).isNull();
    }

    @Test
    @DisplayName("Otro cambio (EMPRENDEDOR→PYME cobrada): 422 de solicitud")
    void otroCambio_requiereSolicitud() {
        cobrada(emprendedor, "active");
        assertThatThrownBy(() -> service.cambiarPlan(10L, 2L)).isInstanceOf(CambioPlanRequiereSolicitudException.class);
        verify(onvoBilling, never()).cancelarInmediato(any());
    }

    @Test
    @DisplayName("Subida con la suscripción en past_due: 422 de solicitud (solo desde active)")
    void subida_pastDue_requiereSolicitud() {
        cobrada(pyme, "past_due");
        assertThatThrownBy(() -> service.cambiarPlan(10L, 3L)).isInstanceOf(CambioPlanRequiereSolicitudException.class);
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
    }

    @Test
    @DisplayName("El mensaje del 422 va en voseo y pide mandar la solicitud")
    void mensajeVoseo() {
        assertThat(CambioPlanRequiereSolicitudException.MENSAJE).contains("Mandanos").contains("querés");
        assertThat(new CambioPlanRequiereSolicitudException()).isInstanceOf(OnvoSolicitudRechazadaException.class);
    }

    @Test
    @DisplayName("BAJO: pago verificado de la suscripción VIEJA se ignora, no cambia el plan y queda en revisión")
    void pagoDeLaVieja_seIgnora() {
        cobrada(pyme, "active");
        sub.setOnvoSubscriptionId("sub_nueva");
        sub.setOnvoSubReemplazada("sub_vieja");
        sub.setPlanPendiente(plus);
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_vieja")).thenReturn(Optional.empty());
        when(suscripcionRepo.findConOnvoSubVieja("sub_vieja")).thenReturn(List.of(sub));

        service.procesarPagoOnvoVerificado("sub_vieja", "NEGOCIO_PLUS", LocalDate.now().plusMonths(1), "inv_123456");

        verify(suscripcionRepo, never()).findByOnvoSubscriptionIdForUpdate(any());
        assertThat(sub.getPlan().getNombre()).isEqualTo("PYME");
        assertThat(empresa.getPlan().getNombre()).isEqualTo("PYME");
        assertThat(sub.getOnvoRevisionManualDesde()).isNotNull();
        verify(empresaRepo, never()).save(any());
    }

    @Test
    @DisplayName("BAJO: también se ignora el pago de una vieja que quedó en onvo_sub_por_cancelar")
    void pagoDeViejaPorCancelar_seIgnora() {
        cobrada(pyme, "active");
        sub.setOnvoSubscriptionId("sub_nueva");
        sub.setOnvoSubPorCancelar("sub_vieja");
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_vieja")).thenReturn(Optional.empty());
        when(suscripcionRepo.findConOnvoSubVieja("sub_vieja")).thenReturn(List.of(sub));

        assertThat(service.ignorarPagoDeSuscripcionVieja("sub_vieja")).isTrue();
        assertThat(sub.getPlan().getNombre()).isEqualTo("PYME");
    }

    @Test
    @DisplayName("El id vigente nunca se trata como viejo")
    void idVigente_noSeIgnora() {
        cobrada(pyme, "active");
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_vieja")).thenReturn(Optional.of(sub));
        assertThat(service.ignorarPagoDeSuscripcionVieja("sub_vieja")).isFalse();
        verify(suscripcionRepo, never()).findConOnvoSubVieja(any());
    }

    @Test
    @DisplayName("Pago verificado de la NUEVA: recién ahí se activa Negocio Plus")
    void pagoDeLaNueva_activaPlus() {
        cobrada(pyme, "active");
        sub.setOnvoSubscriptionId("sub_nueva");
        sub.setOnvoSubReemplazada("sub_vieja");
        sub.setPlanPendiente(plus);
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_nueva")).thenReturn(Optional.of(sub));
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("sub_nueva")).thenReturn(Optional.of(sub));

        service.procesarPagoOnvoVerificado("sub_nueva", "NEGOCIO_PLUS", LocalDate.now().plusMonths(1), "inv_123456");

        assertThat(sub.getPlan().getNombre()).isEqualTo("NEGOCIO_PLUS");
        assertThat(sub.getPlanPendiente()).isNull();
        assertThat(empresa.getPlan().getNombre()).isEqualTo("NEGOCIO_PLUS");
    }

    @Test
    @DisplayName("Cobro de la subida fallido: el plan viejo pagado sigue (no pasa a PAST_DUE)")
    void cobroSubidaFallido_planViejoSigue() {
        cobrada(pyme, "active");
        sub.setOnvoSubscriptionId("sub_nueva");
        sub.setOnvoSubReemplazada("sub_vieja");
        sub.setPlanPendiente(plus);
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_nueva")).thenReturn(Optional.of(sub));

        service.procesarRenovacionFallida("sub_nueva");

        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
        assertThat(empresa.getEstadoPlan()).isEqualTo("ACTIVO");
    }

    @Test
    @DisplayName("esSubidaANegocioPlus: solo hacia NEGOCIO_PLUS desde un plan conocido más bajo")
    void reglaSubida() {
        assertThat(SuscripcionOnvoChangeService.esSubidaANegocioPlus("PYME", "NEGOCIO_PLUS")).isTrue();
        assertThat(SuscripcionOnvoChangeService.esSubidaANegocioPlus("emprendedor", "NEGOCIO_PLUS")).isTrue();
        assertThat(SuscripcionOnvoChangeService.esSubidaANegocioPlus("NEGOCIO_PLUS", "NEGOCIO_PLUS")).isFalse();
        assertThat(SuscripcionOnvoChangeService.esSubidaANegocioPlus("EMPRENDEDOR", "PYME")).isFalse();
        assertThat(SuscripcionOnvoChangeService.esSubidaANegocioPlus("RARO", "NEGOCIO_PLUS")).isFalse();
        assertThat(SuscripcionOnvoChangeService.esSubidaANegocioPlus(null, "NEGOCIO_PLUS")).isFalse();
    }
}
