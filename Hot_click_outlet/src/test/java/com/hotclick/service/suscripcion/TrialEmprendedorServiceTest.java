package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.repository.TrialEmprendedorRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TrialEmprendedorService")
class TrialEmprendedorServiceTest {

    static final LocalDate HOY = LocalDate.of(2026, 11, 20);

    @Mock TrialEmprendedorRepository trialRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock SuscripcionRepository suscripcionRepo;
    @Mock PlanRepository planRepo;
    @Mock CacheManager cacheManager;

    TrialEmprendedorService service;

    @BeforeEach
    void setUp() {
        service = new TrialEmprendedorService(trialRepo, empresaRepo, suscripcionRepo, planRepo, cacheManager, 8);
        lenient().when(empresaRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private Empresa empresaEnTrial(long id, LocalDate hasta) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setPlanSaas("EMPRENDEDOR");
        e.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        e.setTrialEmprendedorPos(3);
        e.setTrialEmprendedorHasta(hasta);
        e.setTrialHasta(hasta);
        return e;
    }

    private Suscripcion subOnvo(String id) {
        Suscripcion s = new Suscripcion();
        s.setOnvoSubscriptionId(id);
        return s;
    }

    private Plan planEmprendedor() {
        Plan p = new Plan();
        p.setNombre("EMPRENDEDOR");
        return p;
    }

    @Test
    @DisplayName("diasRestantes: lo que falta del trial es el trialPeriodDays para ONVO; vencido o sin trial = 0")
    void diasRestantes() {
        assertThat(TrialEmprendedorService.diasRestantes(empresaEnTrial(1, HOY.plusDays(40)), HOY)).isEqualTo(40);
        assertThat(TrialEmprendedorService.diasRestantes(empresaEnTrial(1, HOY), HOY)).isZero();
        assertThat(TrialEmprendedorService.diasRestantes(empresaEnTrial(1, HOY.minusDays(2)), HOY)).isZero();
        assertThat(TrialEmprendedorService.diasRestantes(new Empresa(), HOY)).isZero();
        Empresa sinFecha = empresaEnTrial(1, null);
        assertThat(TrialEmprendedorService.diasRestantes(sinFecha, HOY)).isZero();
    }

    @Test
    @DisplayName("Emprendedor es de pago para quien tuvo trial o entró sin cupo; no para un alta gratis histórica")
    void emprendedorEsDePago() {
        assertThat(TrialEmprendedorService.emprendedorEsDePago(empresaEnTrial(1, HOY))).isTrue();
        Empresa sinCupo = new Empresa();
        sinCupo.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        assertThat(TrialEmprendedorService.emprendedorEsDePago(sinCupo)).isTrue();
        Empresa historica = new Empresa();
        historica.setEstadoPlan("ACTIVO");
        assertThat(TrialEmprendedorService.emprendedorEsDePago(historica)).isFalse();
    }

    @Test
    @DisplayName("Sin tarjeta ni suscripción ONVO: trial vencido → PAST_DUE + fila local con fechaFin (área 5 lo cierra)")
    void sinTarjetaEntraAlFlujoDeImpago() {
        Empresa e = empresaEnTrial(7, HOY.minusDays(1));
        when(empresaRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(e));
        when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.empty());
        when(planRepo.findByNombre("EMPRENDEDOR")).thenReturn(Optional.of(planEmprendedor()));

        assertThat(service.cerrarTrial(7L, HOY)).isTrue();

        assertThat(e.getEstadoPlan()).isEqualTo("PAST_DUE");
        assertThat(e.getFechaVencPlan()).isEqualTo(HOY.minusDays(1));
        ArgumentCaptor<Suscripcion> cap = ArgumentCaptor.forClass(Suscripcion.class);
        verify(suscripcionRepo).save(cap.capture());
        assertThat(cap.getValue().getEstado()).isEqualTo("PAST_DUE");
        assertThat(cap.getValue().getFechaFin()).isEqualTo(HOY.minusDays(1));
        assertThat(cap.getValue().getEmpresa()).isSameAs(e);
        assertThat(cap.getValue().getTrialEnd()).as("trialEnd vacío: el job legacy no lo cierra sin gracia").isNull();
    }

    @Test
    @DisplayName("Con suscripción ONVO sin fechaFin (cobro del fin de trial no confirmado): PAST_DUE con fechaFin = fin del trial")
    void conSuscripcionOnvoSinCobro() {
        Empresa e = empresaEnTrial(7, HOY.minusDays(3));
        Suscripcion sub = subOnvo("sub_1");
        sub.setEstado("TRIAL");
        when(empresaRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(e));
        when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.of(sub));

        assertThat(service.cerrarTrial(7L, HOY)).isTrue();

        assertThat(e.getEstadoPlan()).isEqualTo("PAST_DUE");
        assertThat(sub.getEstado()).isEqualTo("PAST_DUE");
        assertThat(sub.getFechaFin()).isEqualTo(HOY.minusDays(3));
        verify(suscripcionRepo).save(sub);
    }

    @Test
    @DisplayName("Repara el PAST_DUE del webhook sin fechaFin (el job de impago nunca lo elegiría)")
    void reparaPastDueSinFechaFin() {
        Empresa e = empresaEnTrial(7, HOY.minusDays(2));
        e.setEstadoPlan("PAST_DUE");
        Suscripcion sub = subOnvo("sub_1");
        sub.setEstado("PAST_DUE");
        when(empresaRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(e));
        when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.of(sub));

        assertThat(service.cerrarTrial(7L, HOY)).isTrue();
        assertThat(sub.getFechaFin()).isEqualTo(HOY.minusDays(2));
    }

    @Test
    @DisplayName("PAST_DUE que ya tiene fechaFin: el cierre no lo toca otra vez (idempotente)")
    void pastDueConFechaNoSeToca() {
        Empresa e = empresaEnTrial(7, HOY.minusDays(2));
        e.setEstadoPlan("PAST_DUE");
        Suscripcion sub = subOnvo("sub_1");
        sub.setEstado("PAST_DUE");
        sub.setFechaFin(HOY.minusDays(2));
        when(empresaRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(e));
        when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.of(sub));

        assertThat(service.cerrarTrial(7L, HOY)).isFalse();
        verify(suscripcionRepo, never()).save(any());
    }

    @Test
    @DisplayName("Suscripción ya ACTIVO (cobro confirmado): no se toca")
    void suscripcionActivaNoSeToca() {
        Empresa e = empresaEnTrial(7, HOY.minusDays(1));
        Suscripcion sub = subOnvo("sub_1");
        sub.setEstado("ACTIVO");
        when(empresaRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(e));
        when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.of(sub));

        assertThat(service.cerrarTrial(7L, HOY)).isFalse();
        assertThat(e.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
        verify(empresaRepo, never()).save(any());
    }

    @Test
    @DisplayName("Fail-closed: sin plan base para abrir el flujo de impago → VENCIDO directo, nunca gratis")
    void sinPlanBaseQuedaVencido() {
        Empresa e = empresaEnTrial(7, HOY.minusDays(1));
        when(empresaRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(e));
        when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.empty());
        when(planRepo.findByNombre("EMPRENDEDOR")).thenReturn(Optional.empty());

        assertThat(service.cerrarTrial(7L, HOY)).isTrue();
        assertThat(e.getEstadoPlan()).isEqualTo("VENCIDO");
    }

    @Test
    @DisplayName("Trial que no terminó todavía: no se cierra")
    void trialVigenteNoSeCierra() {
        Empresa e = empresaEnTrial(7, HOY);
        when(empresaRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(e));

        assertThat(service.cerrarTrial(7L, HOY)).isFalse();
        verify(empresaRepo, never()).save(any());
    }

    @Test
    @DisplayName("Si el webhook ya lo pasó a ACTIVO, el cierre no lo toca")
    void yaActivadoPorElCobro() {
        Empresa e = empresaEnTrial(7, HOY.minusDays(1));
        e.setEstadoPlan("ACTIVO");
        when(empresaRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(e));

        assertThat(service.cerrarTrial(7L, HOY)).isFalse();
        assertThat(e.getEstadoPlan()).isEqualTo("ACTIVO");
        verify(empresaRepo, never()).save(any());
    }
}
