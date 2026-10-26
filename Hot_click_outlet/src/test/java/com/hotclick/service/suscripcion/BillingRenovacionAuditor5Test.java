package com.hotclick.service.suscripcion;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Auditor 5: S-01, S-03 y S-07 (renovación, cancelación al vencer y trial)")
class BillingRenovacionAuditor5Test {

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName("Renovación")
    class Renovacion {
        @Mock SuscripcionRepository suscripcionRepo;
        @Mock SuscripcionPlanSupport planSupport;
        @Mock OnvoBillingClient onvoBilling;
        @InjectMocks SuscripcionRenewalService service;

        @Test @DisplayName("S-01: sin cobro ONVO configurado, un PAST_DUE vencido NO se degrada")
        void sinCobroNoDegrada() {
            ReflectionTestUtils.setField(service, "diasGracia", 7);
            when(onvoBilling.sinLlave()).thenReturn(true);
            assertThat(service.expirarPastDueVencidos()).isZero();
            verify(suscripcionRepo, never()).findPastDueOnvoVencidos(any(), any());
            verify(suscripcionRepo, never()).saveAll(any());
            // Seguridad B2: durante la pausa se cuenta lo acumulado (WARN).
            verify(suscripcionRepo).countPastDueVencidos(LocalDate.now(Constants.ZONA_CR).minusDays(7));
            verifyNoInteractions(planSupport);
        }

        @Test @DisplayName("S-01: ONVO en mock o deshabilitado tampoco cuenta como forma de pago")
        void mockODeshabilitadoNoDegrada() {
            ReflectionTestUtils.setField(service, "diasGracia", 7);
            when(onvoBilling.isMockMode()).thenReturn(true);
            assertThat(service.expirarPastDueVencidos()).isZero();
            when(onvoBilling.isMockMode()).thenReturn(false);
            when(onvoBilling.isBillingDeshabilitado()).thenReturn(true);
            assertThat(service.expirarPastDueVencidos()).isZero();
            verifyNoInteractions(planSupport);
        }

        private Suscripcion pastDue(long empresaId) {
            Empresa e = new Empresa();
            e.setId(empresaId);
            Suscripcion s = new Suscripcion();
            s.setEmpresa(e);
            s.setEstado("PAST_DUE");
            s.setOnvoSubscriptionId("sub_" + empresaId);
            return s;
        }

        @Test @DisplayName("Gracia escalonada: con cobro, baja solo un lote (máx por corrida), los más viejos primero")
        void bajaEscalonada() {
            ReflectionTestUtils.setField(service, "diasGracia", 7);
            ReflectionTestUtils.setField(service, "maxBajasPorCorrida", 2);
            ArgumentCaptor<org.springframework.data.domain.Pageable> lote =
                ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
            when(suscripcionRepo.findPastDueOnvoVencidos(any(), lote.capture()))
                .thenReturn(List.of(pastDue(1), pastDue(2)));
            assertThat(service.expirarPastDueVencidos()).isEqualTo(2);
            assertThat(lote.getValue().getPageSize()).isEqualTo(2);
            assertThat(lote.getValue().getPageNumber()).isZero();
            verify(planSupport).degradarPlanBatchConCache(eq(List.of(1L, 2L)), any());
            verify(suscripcionRepo, never()).expirarPastDueBatch(any());
        }

        @Test @DisplayName("S-03: cancelarAlVencer con período terminado pasa a plan base")
        void cancelacionVencidaDegrada() {
            LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
            when(suscripcionRepo.findEmpresaIdsCanceladasVencidas(hoy)).thenReturn(List.of(9L));
            when(suscripcionRepo.cerrarCanceladasVencidasBatch(hoy)).thenReturn(1);
            assertThat(service.cerrarCancelacionesVencidas()).isEqualTo(1);
            verify(planSupport).degradarPlanBatchConCache(List.of(9L), hoy);
        }

        @Test @DisplayName("S-03: sin cancelaciones vencidas no se toca nada")
        void sinCancelaciones() {
            when(suscripcionRepo.findEmpresaIdsCanceladasVencidas(any())).thenReturn(List.of());
            assertThat(service.cerrarCancelacionesVencidas()).isZero();
            verify(suscripcionRepo, never()).cerrarCanceladasVencidasBatch(any());
            verifyNoInteractions(planSupport);
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName("Trial")
    class Trial {
        @Mock SuscripcionRepository suscripcionRepo;
        @Mock EmpresaRepository empresaRepo;
        @Mock PlanRepository planRepo;
        @InjectMocks SuscripcionBillingService service;

        private Plan plan(String n) { Plan p = new Plan(); p.setNombre(n); return p; }

        @Test @DisplayName("S-07: el trial usa el plan configurado (PYME), no PRO ni el primero que aparezca")
        void trialUsaPlanConfigurado() {
            Empresa e = new Empresa();
            when(empresaRepo.findById(7L)).thenReturn(Optional.of(e));
            when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.empty());
            when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(plan("PYME")));
            Suscripcion s = service.iniciarTrial(7L);
            assertThat(s.getPlan().getNombre()).isEqualTo("PYME");
            assertThat(e.getPlan().getNombre()).isEqualTo("PYME");
            verify(planRepo, never()).findAll();
            verify(planRepo, never()).findByNombre("PRO");
        }

        @Test @DisplayName("S-07: si el plan configurado no existe, falla en vez de asignar uno arbitrario")
        void sinPlanConfiguradoFalla() {
            when(empresaRepo.findById(7L)).thenReturn(Optional.of(new Empresa()));
            when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.empty());
            when(planRepo.findByNombre("PYME")).thenReturn(Optional.empty());
            assertThatThrownBy(() -> service.iniciarTrial(7L)).isInstanceOf(RecursoNoEncontradoException.class);
            verify(planRepo, never()).findAll();
            verify(suscripcionRepo, never()).save(any());
        }
    }

    @Test @DisplayName("S-01: con PAST_DUE/VENCIDO/TRIAL se puede pagar el mismo plan; ACTIVO no")
    void repagarMismoPlan() {
        Empresa e = new Empresa();
        for (String est : List.of("PAST_DUE", "VENCIDO", "TRIAL")) {
            e.setEstadoPlan(est);
            assertThat(SuscripcionOnvoChangeService.puedeRepagarMismoPlan(e)).as(est).isTrue();
        }
        e.setEstadoPlan("ACTIVO");
        assertThat(SuscripcionOnvoChangeService.puedeRepagarMismoPlan(e)).isFalse();
        e.setEstadoPlan(null);
        assertThat(SuscripcionOnvoChangeService.puedeRepagarMismoPlan(e)).isFalse();
    }

    @Test @DisplayName("Seguridad B1: la consulta de baja por impago exige onvoSubscriptionId no nulo y va por lote")
    void consultaBajaExigeOnvo() throws Exception {
        var m = SuscripcionRepository.class.getMethod("findPastDueOnvoVencidos",
            LocalDate.class, org.springframework.data.domain.Pageable.class);
        String q = m.getAnnotation(org.springframework.data.jpa.repository.Query.class).value();
        assertThat(q).contains("s.estado = 'PAST_DUE'").contains("s.onvoSubscriptionId IS NOT NULL")
            .contains("ORDER BY s.fechaFin ASC");
    }
}
