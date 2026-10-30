package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.repository.TrialEmprendedorRepository;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * H1 de la seguridad de #411: un trial que termina sin cobro exitoso NO se queda gratis. Cadena completa con las
 * mismas condiciones que las consultas del área 5: trial vencido → cierre del trial (PAST_DUE + fechaFin) → job
 * diario de impago → VENCIDO + tienda suspendida (y por lo tanto bloqueada).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Trial Emprendedor sin cobro → impago área 5 → VENCIDO y suspendido (H1)")
class TrialImpagoCadenaTest {

    static final int GRACIA = 8;
    final LocalDate hoy = LocalDate.now(Constants.ZONA_CR);

    @Mock TrialEmprendedorRepository trialRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock SuscripcionRepository suscripcionRepo;
    @Mock PlanRepository planRepo;
    @Mock CacheManager cacheManager;
    @Mock SuscripcionPlanSupport planSupport;
    @Mock OnvoBillingClient onvoBilling;
    @Mock OnvoRenovacionReconsulta reconsulta;

    TrialEmprendedorService trial;
    @org.mockito.InjectMocks SuscripcionRenewalService renovacion;

    @BeforeEach
    void setUp() {
        trial = new TrialEmprendedorService(trialRepo, empresaRepo, suscripcionRepo, planRepo, cacheManager, GRACIA);
        ReflectionTestUtils.setField(renovacion, "diasGracia", GRACIA);
        Plan plan = new Plan();
        plan.setNombre("EMPRENDEDOR");
        lenient().when(planRepo.findByNombre("EMPRENDEDOR")).thenReturn(Optional.of(plan));
        lenient().when(empresaRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(suscripcionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private Empresa empresaEnTrial(long id, LocalDate finTrial) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setPlanSaas("EMPRENDEDOR");
        e.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        e.setTrialEmprendedorPos(5);
        e.setTrialEmprendedorHasta(finTrial);
        lenient().when(empresaRepo.findByIdForUpdate(id)).thenReturn(Optional.of(e));
        return e;
    }

    /** Las dos consultas del job de impago, con la misma condición que el JPQL (estado, fecha_fin < límite, ONVO sí/no). */
    private void consultasDelJob(Suscripcion s) {
        ReflectionTestUtils.setField(s, "id", 900L + s.getEmpresa().getId()); // fila ya persistida
        LocalDate limite = hoy.minusDays(GRACIA);
        boolean candidata = "PAST_DUE".equals(s.getEstado()) && s.getFechaFin() != null && s.getFechaFin().isBefore(limite);
        boolean conOnvo = s.getOnvoSubscriptionId() != null;
        when(suscripcionRepo.findPastDueOnvoVencidos(any(), any()))
            .thenReturn(candidata && conOnvo ? List.of(s) : List.of(), List.of());
        lenient().when(suscripcionRepo.findPastDueLegadoVencidos(any(), any()))
            .thenReturn(candidata && !conOnvo ? List.of(s) : List.of(), List.of());
        lenient().when(suscripcionRepo.marcarVencidoSiPastDue(anyLong())).thenAnswer(inv -> {
            s.setEstado("VENCIDO");
            return 1;
        });
    }

    private Suscripcion subCreadaPorElCierre() {
        org.mockito.ArgumentCaptor<Suscripcion> cap = org.mockito.ArgumentCaptor.forClass(Suscripcion.class);
        verify(suscripcionRepo).save(cap.capture());
        return cap.getValue();
    }

    @Test
    @DisplayName("Sin tarjeta (no hay suscripción ONVO): pasada la gracia queda VENCIDO, degradado y suspendido")
    void sinTarjetaTerminaVencidoYSuspendido() {
        Empresa e = empresaEnTrial(7, hoy.minusDays(GRACIA + 1));
        when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.empty());

        assertThat(trial.cerrarTrial(7L, hoy)).isTrue();
        Suscripcion sub = subCreadaPorElCierre();
        assertThat(e.getEstadoPlan()).isEqualTo("PAST_DUE");

        consultasDelJob(sub);
        assertThat(renovacion.expirarPastDueVencidos()).isEqualTo(1);

        assertThat(sub.getEstado()).isEqualTo("VENCIDO");
        verify(planSupport).degradarPlanBatchConCache(List.of(7L), hoy);
        verify(empresaRepo).suspenderPorImpagoBatch(List.of(7L));
    }

    @Test
    @DisplayName("Con tarjeta y cobro fallido (ONVO confirma no pagada): pasada la gracia queda VENCIDO y suspendido")
    void cobroFallidoTerminaVencidoYSuspendido() {
        Empresa e = empresaEnTrial(8, hoy.minusDays(GRACIA + 1));
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setEstado("TRIAL"); // el alta ONVO la dejó en TRIAL; el cobro del fin de trial falló y nunca llegó PAGADA
        sub.setOnvoSubscriptionId("sub_fail");
        when(suscripcionRepo.findActivaByEmpresaId(8L)).thenReturn(Optional.of(sub));

        assertThat(trial.cerrarTrial(8L, hoy)).isTrue();
        assertThat(sub.getEstado()).isEqualTo("PAST_DUE");
        assertThat(sub.getFechaFin()).isEqualTo(hoy.minusDays(GRACIA + 1));

        consultasDelJob(sub);
        when(reconsulta.reconsultar(any(), any(), any())).thenReturn(OnvoRenovacionReconsulta.Estado.NO_PAGADA);
        assertThat(renovacion.expirarPastDueVencidos()).isEqualTo(1);

        assertThat(sub.getEstado()).isEqualTo("VENCIDO");
        verify(empresaRepo).suspenderPorImpagoBatch(List.of(8L));
    }

    @Test
    @DisplayName("Con tarjeta y cobro que ONVO sí confirma al reconsultar: no se da de baja")
    void cobroConfirmadoPorOnvoNoSeDaDeBaja() {
        Empresa e = empresaEnTrial(9, hoy.minusDays(GRACIA + 1));
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setEstado("PAST_DUE"); // el webhook failed llegó primero; después ONVO cobró
        sub.setOnvoSubscriptionId("sub_ok");
        when(suscripcionRepo.findActivaByEmpresaId(9L)).thenReturn(Optional.of(sub));

        assertThat(trial.cerrarTrial(9L, hoy)).isTrue(); // repara la fechaFin faltante

        consultasDelJob(sub);
        when(reconsulta.reconsultar(any(), any(), any())).thenReturn(OnvoRenovacionReconsulta.Estado.PAGADA);
        assertThat(renovacion.expirarPastDueVencidos()).isZero();

        verify(suscripcionRepo, never()).marcarVencidoSiPastDue(anyLong());
        verify(empresaRepo, never()).suspenderPorImpagoBatch(any());
    }

    @Test
    @DisplayName("Dentro de la gracia (trial terminó ayer): PAST_DUE, todavía no se suspende")
    void dentroDeLaGraciaNoSeSuspende() {
        Empresa e = empresaEnTrial(10, hoy.minusDays(1));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());

        assertThat(trial.cerrarTrial(10L, hoy)).isTrue();
        Suscripcion sub = subCreadaPorElCierre();
        assertThat(e.getEstadoPlan()).isEqualTo("PAST_DUE");

        consultasDelJob(sub);
        assertThat(renovacion.expirarPastDueVencidos()).isZero();
        verify(empresaRepo, never()).suspenderPorImpagoBatch(any());
    }
}
