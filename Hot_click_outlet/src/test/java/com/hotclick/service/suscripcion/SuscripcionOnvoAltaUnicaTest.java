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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * M1 (Seguridad #422): el alta ONVO es única por negocio. Con repositorios en memoria que se comportan como la BD
 * (lo que guarda una llamada lo ve la siguiente, que es lo que garantiza el lock de fila en producción) se simula el
 * reintento / doble POST y se comprueba que ONVO recibe UNA sola creación, que nunca se pisa un id existente y que una
 * suscripción creada que no se pudo guardar se cancela (no queda huérfana).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("M1: alta ONVO única por negocio (lock, reintento y huérfanas)")
class SuscripcionOnvoAltaUnicaTest {

    @Mock SuscripcionRepository suscripcionRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock PlanRepository planRepo;
    @Mock OnvoBillingClient onvoBilling;
    @Mock OnvoService onvoService;
    @Mock SuscripcionPlanSupport planSupport;

    SuscripcionOnvoChangeService service;
    Empresa empresa;
    /** "Tabla" de suscripciones del negocio 10. */
    final List<Suscripcion> tabla = new ArrayList<>();

    @BeforeEach
    void setUp() {
        service = new SuscripcionOnvoChangeService(
            suscripcionRepo, empresaRepo, planRepo, onvoBilling, onvoService, planSupport, null);
        ReflectionTestUtils.setField(service, "self", service);
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");
        ReflectionTestUtils.setField(service, "environment", env);

        Plan plan = new Plan();
        plan.setId(1L);
        plan.setNombre("EMPRENDEDOR");
        empresa = new Empresa();
        empresa.setId(10L);
        empresa.setNombreEmpresa("Demo");
        empresa.setCorreoEmpresa("demo@negocio.cr");
        empresa.setPlanSaas("EMPRENDEDOR");
        empresa.setPlan(plan);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        LocalDate fin = LocalDate.now(Constants.ZONA_CR).plusDays(40);
        empresa.setTrialEmprendedorPos(4);
        empresa.setTrialEmprendedorHasta(fin);
        empresa.setTrialHasta(fin);

        lenient().when(planRepo.findByNombre("EMPRENDEDOR")).thenReturn(Optional.of(plan));
        lenient().when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        lenient().when(empresaRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(empresa));
        lenient().when(suscripcionRepo.findActivasByEmpresaId(10L)).thenAnswer(inv -> new ArrayList<>(tabla));
        lenient().when(suscripcionRepo.save(any())).thenAnswer(inv -> {
            Suscripcion s = inv.getArgument(0);
            if (!tabla.contains(s)) tabla.add(s);
            return s;
        });
        lenient().when(onvoBilling.getPriceIdForPlan("EMPRENDEDOR")).thenReturn("price_emprendedor");
        lenient().when(onvoBilling.crearCustomer(any(), any(), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoCustomer("cus_1"));
        lenient().when(onvoService.getPublishableKey()).thenReturn("pk_test");
    }

    @Test
    @DisplayName("Reintento / doble POST: la segunda llamada reutiliza el id guardado y ONVO recibe una sola creación")
    void reintentoNoCreaSegundaSuscripcion() {
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_emprendedor"), anyMap(), anyInt()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_1", "item_1"));

        var a = service.asegurarSuscripcionTrial(10L);
        var b = service.asegurarSuscripcionTrial(10L);
        var c = service.asegurarSuscripcionTrial(10L);

        assertThat(a.subscriptionId()).isEqualTo("sub_1");
        assertThat(b.subscriptionId()).isEqualTo("sub_1");
        assertThat(c.subscriptionId()).isEqualTo("sub_1");
        verify(onvoBilling, times(1)).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        verify(onvoBilling, times(1)).crearCustomer(any(), any(), anyMap());
        assertThat(tabla).hasSize(1);
        verify(empresaRepo, times(1)).findByIdForUpdate(10L);
    }

    @Test
    @DisplayName("Carrera perdida: si al tomar el lock otra llamada ya guardó su suscripción, se reutiliza sin llamar a ONVO")
    void despuesDelLockSeVuelveALeer() {
        Suscripcion ganadora = new Suscripcion();
        ganadora.setOnvoSubscriptionId("sub_ganadora");
        ganadora.setOnvoCustomerId("cus_g");
        ganadora.setOnvoPriceId("price_emprendedor");
        // Antes del lock el negocio no tiene suscripción; cuando se obtiene el lock, la otra llamada ya la guardó.
        when(empresaRepo.findByIdForUpdate(10L)).thenAnswer(inv -> {
            tabla.add(ganadora);
            return Optional.of(empresa);
        });

        var out = service.asegurarSuscripcionTrial(10L);

        assertThat(out.subscriptionId()).isEqualTo("sub_ganadora");
        verify(onvoBilling, never()).crearCustomer(any(), any(), anyMap());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        verify(suscripcionRepo, never()).save(any());
    }

    @Test
    @DisplayName("Nunca se pisa un onvoSubscriptionId existente (ni con otro precio): no se crea nada en ONVO")
    void noPisaIdExistente() {
        Suscripcion existente = new Suscripcion();
        existente.setOnvoSubscriptionId("sub_vieja");
        existente.setOnvoPriceId("price_pyme");
        tabla.add(existente);

        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L)).isInstanceOf(IllegalStateException.class);

        assertThat(existente.getOnvoSubscriptionId()).isEqualTo("sub_vieja");
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        verify(suscripcionRepo, never()).save(any());
    }

    @Test
    @DisplayName("Huérfana: si lo creado en ONVO no se puede guardar, se cancela de inmediato y el error sube")
    void huerfanaSeCancela() {
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_huerfana", "item_1"));
        doThrow(new IllegalStateException("fallo de BD")).when(suscripcionRepo).save(any());

        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L)).isInstanceOf(IllegalStateException.class);

        verify(onvoBilling).cancelarInmediato("sub_huerfana");
        assertThat(tabla).isEmpty();
    }

    @Test
    @DisplayName("Huérfana: si además falla la cancelación, el error original es el que sube (queda alerta en el log)")
    void huerfanaConCancelacionFallidaConservaElError() {
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_huerfana", "item_1"));
        doThrow(new IllegalStateException("fallo de BD")).when(suscripcionRepo).save(any());
        doThrow(new IllegalArgumentException("ONVO caído")).when(onvoBilling).cancelarInmediato(anyString());

        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("fallo de BD");

        verify(onvoBilling).cancelarInmediato("sub_huerfana");
    }

    @Test
    @DisplayName("Si ONVO falla al crear no hay nada que cancelar ni se guarda nada")
    void falloAlCrearNoCancelaNada() {
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenThrow(new IllegalStateException("ONVO no disponible"));

        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L)).isInstanceOf(IllegalStateException.class);

        verify(onvoBilling, never()).cancelarInmediato(any());
        verify(suscripcionRepo, never()).save(any());
    }
}
