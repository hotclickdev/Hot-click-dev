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
        @Mock com.hotclick.repository.EmpresaRepository empresaRepo;
        @Mock OnvoRenovacionReconsulta reconsulta;
        @InjectMocks SuscripcionRenewalService service;

        @org.junit.jupiter.api.BeforeEach
        void onvoConfirmaSinPago() {
            // Por defecto ONVO confirma que no hay pago vigente: se da de baja como antes de A5-01.
            lenient().when(reconsulta.reconsultar(any(), any())).thenReturn(OnvoRenovacionReconsulta.Estado.NO_PAGADA);
        }

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
            ReflectionTestUtils.setField(s, "id", empresaId * 10);
            s.setEmpresa(e);
            s.setEstado("PAST_DUE");
            s.setOnvoSubscriptionId("sub_" + empresaId);
            return s;
        }

        @Test @DisplayName("26-oct: con cobro se bajan todos los vencidos en lotes del tamaño configurado, los más viejos primero")
        void bajaEscalonada() {
            ReflectionTestUtils.setField(service, "diasGracia", 7);
            ReflectionTestUtils.setField(service, "maxBajasPorCorrida", 2);
            ArgumentCaptor<org.springframework.data.domain.Pageable> lote =
                ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
            lenient().when(suscripcionRepo.marcarVencidoSiPastDue(any())).thenReturn(1);
            when(suscripcionRepo.findPastDueOnvoVencidos(any(), lote.capture()))
                .thenReturn(List.of(pastDue(1), pastDue(2)), List.of());
            assertThat(service.expirarPastDueVencidos()).isEqualTo(2);
            assertThat(lote.getValue().getPageSize()).isEqualTo(2);
            assertThat(lote.getValue().getPageNumber()).isZero();
            verify(planSupport).degradarPlanBatchConCache(eq(List.of(1L, 2L)), any());
            verify(suscripcionRepo, never()).expirarPastDueBatch(any());
        }

        @Test @DisplayName("MEDIO: PAST_DUE heredados sin onvoSubscriptionId se bajan con cobro, dentro del cupo del lote")
        void legadoSinOnvoSeBaja() {
            ReflectionTestUtils.setField(service, "diasGracia", 7);
            ReflectionTestUtils.setField(service, "maxBajasPorCorrida", 3);
            ArgumentCaptor<org.springframework.data.domain.Pageable> resto =
                ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
            lenient().when(suscripcionRepo.marcarVencidoSiPastDue(any())).thenReturn(1);
            when(suscripcionRepo.findPastDueOnvoVencidos(any(), any())).thenReturn(List.of(pastDue(1)), List.of());
            when(suscripcionRepo.findPastDueLegadoVencidos(any(), resto.capture()))
                .thenReturn(List.of(pastDue(2), pastDue(3)), List.of());
            assertThat(service.expirarPastDueVencidos()).isEqualTo(3);
            assertThat(resto.getAllValues().get(0).getPageSize()).isEqualTo(2);
            verify(planSupport).degradarPlanBatchConCache(eq(List.of(1L, 2L, 3L)), any());
        }

        @Test @DisplayName("MEDIO carrera: el webhook activa la suscripción entre el SELECT y el UPDATE → no VENCIDO ni FREE")
        void carreraWebhookNoDegrada() {
            ReflectionTestUtils.setField(service, "diasGracia", 7);
            ReflectionTestUtils.setField(service, "maxBajasPorCorrida", 3);
            when(suscripcionRepo.findPastDueOnvoVencidos(any(), any())).thenReturn(List.of(pastDue(1), pastDue(2)), List.of());
            when(suscripcionRepo.findPastDueLegadoVencidos(any(), any())).thenReturn(List.of());
            when(suscripcionRepo.marcarVencidoSiPastDue(10L)).thenReturn(0); // ya ACTIVO
            when(suscripcionRepo.marcarVencidoSiPastDue(20L)).thenReturn(1);
            assertThat(service.expirarPastDueVencidos()).isEqualTo(1);
            verify(planSupport).degradarPlanBatchConCache(eq(List.of(2L)), any());
            verify(suscripcionRepo, never()).saveAll(any());
        }

        @Test @DisplayName("A5-01: si ONVO dice que el cliente SÍ pagó, se reactiva y NO se marca VENCIDO ni se degrada")
        void clientePagoNoSeBaja() {
            ReflectionTestUtils.setField(service, "diasGracia", 7);
            ReflectionTestUtils.setField(service, "maxBajasPorCorrida", 3);
            Suscripcion pagada = pastDue(1);
            Suscripcion sinPago = pastDue(2);
            when(suscripcionRepo.findPastDueOnvoVencidos(any(), any())).thenReturn(List.of(pagada, sinPago), List.of(), List.of());
            when(suscripcionRepo.findPastDueLegadoVencidos(any(), any())).thenReturn(List.of());
            when(reconsulta.reconsultar(eq(pagada), any())).thenReturn(OnvoRenovacionReconsulta.Estado.PAGADA);
            when(suscripcionRepo.marcarVencidoSiPastDue(20L)).thenReturn(1);
            assertThat(service.expirarPastDueVencidos()).isEqualTo(1);
            verify(suscripcionRepo, never()).marcarVencidoSiPastDue(10L);
            verify(planSupport).degradarPlanBatchConCache(eq(List.of(2L)), any());
            verify(empresaRepo).suspenderPorImpagoBatch(List.of(2L));
        }

        @Test @DisplayName("A5-01: si el GET a ONVO falla (INCIERTA), NO se da de baja, y la corrida termina sin repetir esa fila")
        void getFallaNoSeBaja() {
            ReflectionTestUtils.setField(service, "diasGracia", 7);
            ReflectionTestUtils.setField(service, "maxBajasPorCorrida", 2);
            Suscripcion incierta = pastDue(1);
            Suscripcion sinPago = pastDue(2);
            ArgumentCaptor<org.springframework.data.domain.Pageable> pag =
                ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
            // la fila incierta sigue PAST_DUE y reaparece en cada consulta: no debe bloquear ni ciclar
            when(suscripcionRepo.findPastDueOnvoVencidos(any(), pag.capture()))
                .thenReturn(List.of(incierta), List.of(incierta, sinPago), List.of(incierta));
            when(suscripcionRepo.findPastDueLegadoVencidos(any(), any())).thenReturn(List.of());
            when(reconsulta.reconsultar(eq(incierta), any())).thenReturn(OnvoRenovacionReconsulta.Estado.INCIERTA);
            when(suscripcionRepo.marcarVencidoSiPastDue(20L)).thenReturn(1);
            assertThat(service.expirarPastDueVencidos()).isEqualTo(1);
            verify(suscripcionRepo, never()).marcarVencidoSiPastDue(10L);
            verify(planSupport, never()).degradarPlanBatchConCache(argThat(l -> l.contains(1L)), any());
            verify(reconsulta, times(1)).reconsultar(eq(incierta), any()); // una sola consulta por corrida
            assertThat(pag.getAllValues().get(1).getPageSize()).isEqualTo(3); // max + omitidas
        }

        @Test @DisplayName("A5-01: los PAST_DUE heredados (sin onvoSubscriptionId) no consultan a ONVO")
        void legadoNoConsultaOnvo() {
            ReflectionTestUtils.setField(service, "diasGracia", 7);
            ReflectionTestUtils.setField(service, "maxBajasPorCorrida", 3);
            Suscripcion legado = pastDue(5);
            legado.setOnvoSubscriptionId(null);
            when(suscripcionRepo.findPastDueOnvoVencidos(any(), any())).thenReturn(List.of());
            when(suscripcionRepo.findPastDueLegadoVencidos(any(), any())).thenReturn(List.of(legado), List.of());
            when(suscripcionRepo.marcarVencidoSiPastDue(50L)).thenReturn(1);
            assertThat(service.expirarPastDueVencidos()).isEqualTo(1);
            // B1: solo reinicia el conteo de la corrida; no hay ninguna consulta a ONVO para el legado.
            verify(reconsulta).iniciarCorrida();
            verifyNoMoreInteractions(reconsulta);
        }

        @Test @DisplayName("MEDIO carrera: si todas las filas cambiaron, no se degrada a nadie")
        void carreraTodasActivadas() {
            ReflectionTestUtils.setField(service, "diasGracia", 7);
            when(suscripcionRepo.findPastDueOnvoVencidos(any(), any())).thenReturn(List.of(pastDue(1)), List.of());
            when(suscripcionRepo.findPastDueLegadoVencidos(any(), any())).thenReturn(List.of());
            when(suscripcionRepo.marcarVencidoSiPastDue(10L)).thenReturn(0);
            assertThat(service.expirarPastDueVencidos()).isZero();
            verifyNoInteractions(planSupport);
        }

        @Test @DisplayName("MEDIO: sin cobro disponible tampoco se bajan los PAST_DUE heredados")
        void legadoSinCobroNoSeBaja() {
            ReflectionTestUtils.setField(service, "diasGracia", 7);
            when(onvoBilling.sinLlave()).thenReturn(true);
            assertThat(service.expirarPastDueVencidos()).isZero();
            verify(suscripcionRepo, never()).findPastDueLegadoVencidos(any(), any());
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
