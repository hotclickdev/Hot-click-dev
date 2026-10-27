package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Cambio a Emprendedor después de (o durante) el trial: pasa a cobro automático mensual por ONVO. */
@ExtendWith(MockitoExtension.class)
@DisplayName("Trial Emprendedor → cobro automático ONVO")
class SuscripcionOnvoChangeTrialEmprendedorTest {

    @Mock SuscripcionRepository suscripcionRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock PlanRepository planRepo;
    @Mock OnvoBillingClient onvoBilling;
    @Mock OnvoService onvoService;
    @Mock SuscripcionPlanSupport planSupport;

    SuscripcionOnvoChangeService service;
    Empresa empresa;
    Plan planEmprendedor;

    @BeforeEach
    void setUp() {
        service = new SuscripcionOnvoChangeService(
            suscripcionRepo, empresaRepo, planRepo, onvoBilling, onvoService, planSupport, null);
        ReflectionTestUtils.setField(service, "self", service);
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");
        ReflectionTestUtils.setField(service, "environment", env);

        planEmprendedor = new Plan();
        planEmprendedor.setId(1L);
        planEmprendedor.setNombre("EMPRENDEDOR");

        empresa = new Empresa();
        empresa.setId(10L);
        empresa.setNombreEmpresa("Demo");
        empresa.setCorreoEmpresa("demo@negocio.cr");
        empresa.setPlanSaas("EMPRENDEDOR");
        empresa.setPlan(planEmprendedor);
        empresa.setTrialEmprendedorPos(4);

        lenient().when(planRepo.findById(1L)).thenReturn(Optional.of(planEmprendedor));
        lenient().when(planRepo.findByNombre("EMPRENDEDOR")).thenReturn(Optional.of(planEmprendedor));
        lenient().when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        lenient().when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());
        lenient().when(suscripcionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(onvoBilling.getPriceIdForPlan("EMPRENDEDOR")).thenReturn("price_emprendedor");
        lenient().when(onvoBilling.crearCustomer(any(), any(), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoCustomer("cus_1"));
        lenient().when(onvoService.getPublishableKey()).thenReturn("pk_test");
    }

    private void estadoTrial(int diasRestantes) {
        LocalDate fin = LocalDate.now(Constants.ZONA_CR).plusDays(diasRestantes);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        empresa.setTrialEmprendedorHasta(fin);
        empresa.setTrialHasta(fin);
    }

    @Test
    @DisplayName("Durante el trial: ONVO recibe los días que quedan como trialPeriodDays (cobra recién al terminar)")
    void duranteElTrialSeEnviaTrialPeriodDays() {
        estadoTrial(40);
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_emprendedor"), anyMap(), eq(40)))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_trial", "item_1"));

        Map<String, Object> out = service.cambiarPlan(10L, 1L);

        assertThat(out.get("status")).isEqualTo("requiere_pago");
        assertThat(out.get("subscriptionId")).isEqualTo("sub_trial");
        assertThat(out.get("trialDias")).isEqualTo(40);
        // El plan NO se activa por el simple alta: sigue TRIAL hasta que el webhook confirme el cobro.
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
    }

    @Test
    @DisplayName("Trial terminado (VENCIDO): no vuelve gratis, se crea la suscripción con cobro inmediato (sin trial)")
    void trialTerminadoNoVuelveGratis() {
        empresa.setEstadoPlan("VENCIDO");
        empresa.setTrialEmprendedorHasta(LocalDate.now(Constants.ZONA_CR).minusDays(5));
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_emprendedor"), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_pago", "item_1"));

        Map<String, Object> out = service.cambiarPlan(10L, 1L);

        assertThat(out.get("status")).isEqualTo("requiere_pago");
        assertThat(empresa.getEstadoPlan()).isEqualTo("VENCIDO");
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        verify(onvoBilling, never()).cancelarAlVencer(any());
    }

    @Test
    @DisplayName("Negocio sin cupo (REQUIERE_MEMBRESIA, el 71+): paga con cobro inmediato, sin trial")
    void sinCupoPagaSinTrial() {
        empresa.setTrialEmprendedorPos(null);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_emprendedor"), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_pago", "item_1"));

        Map<String, Object> out = service.cambiarPlan(10L, 1L);

        assertThat(out.get("status")).isEqualTo("requiere_pago");
        assertThat(out).doesNotContainKey("trialDias");
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
    }

    @Test
    @DisplayName("Idempotente: si ya hay suscripción ONVO de Emprendedor no se crea otra ni se cambia el precio")
    void yaTieneSuscripcionOnvo() {
        estadoTrial(40);
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(empresa);
        sub.setPlan(planEmprendedor);
        sub.setOnvoSubscriptionId("sub_trial");
        sub.setOnvoCustomerId("cus_1");
        sub.setOnvoPriceId("price_emprendedor");
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(sub));

        Map<String, Object> out = service.cambiarPlan(10L, 1L);

        assertThat(out.get("subscriptionId")).isEqualTo("sub_trial");
        verify(onvoBilling, never()).crearCustomer(any(), any(), anyMap());
        verify(onvoBilling, never()).cambiarPrecioSuscripcion(any(), any(), any());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
    }

    @Test
    @DisplayName("Fail-closed: sin llave ONVO en producción no se activa el cobro ni se toca el plan")
    void sinLlaveFallaCerrado() {
        estadoTrial(40);
        when(onvoBilling.isMockMode()).thenReturn(false);
        when(onvoBilling.sinLlave()).thenReturn(true);

        assertThatThrownBy(() -> service.cambiarPlan(10L, 1L))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("Pagos no configurados");
        verify(onvoBilling, never()).crearCustomer(any(), any(), anyMap());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        verify(empresaRepo, never()).save(any());
    }

    @Test
    @DisplayName("Fail-closed: sin ONVO_PRICE_ID_EMPRENDEDOR no se crea la suscripción")
    void sinPriceIdFallaCerrado() {
        estadoTrial(40);
        when(onvoBilling.getPriceIdForPlan("EMPRENDEDOR")).thenReturn(null);

        assertThatThrownBy(() -> service.cambiarPlan(10L, 1L))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("sin precio ONVO");
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
    }

    @Test
    @DisplayName("Alta histórica gratis (sin trial) sigue pudiendo quedarse en Emprendedor sin pagar (grandfathered)")
    void altaHistoricaSigueGratis() {
        empresa.setTrialEmprendedorPos(null);
        empresa.setEstadoPlan("ACTIVO");
        // Mismo plan y ACTIVO: no hay nada que cobrar ni que cambiar.
        assertThatThrownBy(() -> service.cambiarPlan(10L, 1L))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Ya tenés el plan");
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
    }

    @Test
    @DisplayName("H1: la suscripción creada durante el trial lleva fechaFin = último día del trial (sin trialEnd)")
    void altaDuranteElTrialGuardaFechaFin() {
        estadoTrial(40);
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_emprendedor"), anyMap(), eq(40)))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_trial", "item_1"));

        service.cambiarPlan(10L, 1L);

        org.mockito.ArgumentCaptor<Suscripcion> cap = org.mockito.ArgumentCaptor.forClass(Suscripcion.class);
        verify(suscripcionRepo, org.mockito.Mockito.atLeastOnce()).save(cap.capture());
        Suscripcion guardada = cap.getAllValues().get(cap.getAllValues().size() - 1);
        assertThat(guardada.getOnvoSubscriptionId()).isEqualTo("sub_trial");
        assertThat(guardada.getFechaFin()).isEqualTo(empresa.getTrialEmprendedorHasta());
        assertThat(guardada.getTrialEnd()).isNull();
    }

    @Test
    @DisplayName("H1: renewal.failed de una suscripción de trial sin fechaFin la rellena (el job de impago la ve)")
    void renovacionFallidaRellenaFechaFinConElFinDelTrial() {
        LocalDate finTrial = LocalDate.now(Constants.ZONA_CR).minusDays(2);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        empresa.setTrialEmprendedorHasta(finTrial);
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(empresa);
        sub.setPlan(planEmprendedor);
        sub.setOnvoSubscriptionId("sub_trial");
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_trial")).thenReturn(Optional.of(sub));

        service.procesarRenovacionFallida("sub_trial");

        assertThat(sub.getEstado()).isEqualTo("PAST_DUE");
        assertThat(sub.getFechaFin()).isEqualTo(finTrial);
        assertThat(empresa.getEstadoPlan()).isEqualTo("PAST_DUE");
    }

    @Test
    @DisplayName("H1: renewal.failed sin fechaFin y sin trial usa hoy; con fechaFin ya puesta no la cambia")
    void renovacionFallidaSinTrialUsaHoyYRespetaFechaExistente() {
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        empresa.setTrialEmprendedorPos(null);
        empresa.setTrialEmprendedorHasta(null);
        Suscripcion sinFecha = new Suscripcion();
        sinFecha.setEmpresa(empresa);
        sinFecha.setOnvoSubscriptionId("sub_a");
        Suscripcion conFecha = new Suscripcion();
        conFecha.setEmpresa(empresa);
        conFecha.setOnvoSubscriptionId("sub_b");
        conFecha.setFechaFin(hoy.plusDays(5));
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_a")).thenReturn(Optional.of(sinFecha));
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_b")).thenReturn(Optional.of(conFecha));

        service.procesarRenovacionFallida("sub_a");
        service.procesarRenovacionFallida("sub_b");

        assertThat(sinFecha.getFechaFin()).isEqualTo(hoy);
        assertThat(conFecha.getFechaFin()).isEqualTo(hoy.plusDays(5));
    }

    @Test
    @DisplayName("Captura de tarjeta: crea la suscripción ONVO del trial con los días que quedan y NO activa el plan")
    void tarjetaTrialCreaSuscripcionSinActivar() {
        estadoTrial(40);
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_emprendedor"), anyMap(), eq(40)))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_trial", "item_1"));

        SuscripcionOnvoChangeService.SuscripcionTrial out = service.asegurarSuscripcionTrial(10L);

        assertThat(out.subscriptionId()).isEqualTo("sub_trial");
        assertThat(out.customerId()).isEqualTo("cus_1");
        assertThat(out.mock()).isFalse();
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
        verify(empresaRepo, never()).save(any());
    }

    @Test
    @DisplayName("Captura de tarjeta: si ya hay suscripción ONVO de Emprendedor se reutiliza, no se crea otra")
    void tarjetaTrialReutilizaSuscripcion() {
        estadoTrial(40);
        Suscripcion existente = new Suscripcion();
        existente.setOnvoSubscriptionId("sub_previa");
        existente.setOnvoCustomerId("cus_9");
        existente.setOnvoPriceId("price_emprendedor");
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(existente));

        SuscripcionOnvoChangeService.SuscripcionTrial out = service.asegurarSuscripcionTrial(10L);

        assertThat(out.subscriptionId()).isEqualTo("sub_previa");
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
    }

    @Test
    @DisplayName("Captura de tarjeta: una suscripción ONVO de otro precio no se toca (estado ajeno al trial)")
    void tarjetaTrialSuscripcionDeOtroPrecio() {
        estadoTrial(40);
        Suscripcion otra = new Suscripcion();
        otra.setOnvoSubscriptionId("sub_pyme");
        otra.setOnvoPriceId("price_pyme");
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(otra));
        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L)).isInstanceOf(IllegalStateException.class);
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
    }

    @Test
    @DisplayName("Captura de tarjeta, fail-closed: sin llave de ONVO en producción no se crea nada")
    void tarjetaTrialSinLlaveEnProduccion() {
        estadoTrial(40);
        when(onvoBilling.sinLlave()).thenReturn(true);
        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L))
            .isInstanceOf(com.hotclick.exception.CobroPlanNoDisponibleException.class);
        verify(onvoBilling, never()).crearCustomer(any(), any(), anyMap());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
    }

    @Test
    @DisplayName("Captura de tarjeta, fail-closed: llave de prueba en un entorno productivo (billing deshabilitado)")
    void tarjetaTrialBillingDeshabilitado() {
        estadoTrial(40);
        when(onvoBilling.isBillingDeshabilitado()).thenReturn(true);
        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L))
            .isInstanceOf(com.hotclick.exception.CobroPlanNoDisponibleException.class);
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
    }

    @Test
    @DisplayName("Captura de tarjeta en dev/test sin llave: modo simulado, no activa el plan local ni llama a ONVO")
    void tarjetaTrialMockNoActivaPlan() {
        estadoTrial(40);
        MockEnvironment dev = new MockEnvironment();
        dev.setActiveProfiles("dev");
        ReflectionTestUtils.setField(service, "environment", dev);
        when(onvoBilling.isMockMode()).thenReturn(true);

        SuscripcionOnvoChangeService.SuscripcionTrial out = service.asegurarSuscripcionTrial(10L);

        assertThat(out.mock()).isTrue();
        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
    }
}
