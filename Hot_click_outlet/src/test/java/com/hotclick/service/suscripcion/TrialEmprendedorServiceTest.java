package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.repository.TrialEmprendedorRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
    @Mock CacheManager cacheManager;

    TrialEmprendedorService service;

    @BeforeEach
    void setUp() {
        service = new TrialEmprendedorService(trialRepo, empresaRepo, suscripcionRepo, cacheManager, 8);
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
    @DisplayName("Trial vencido sin cobro ONVO → VENCIDO (fail-closed: sin pago no hay plan)")
    void vencidoSinCobro() {
        Empresa e = empresaEnTrial(7, HOY.minusDays(1));
        when(empresaRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(e));
        when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.empty());

        assertThat(service.cerrarTrial(7L, HOY)).isTrue();
        assertThat(e.getEstadoPlan()).isEqualTo("VENCIDO");
        assertThat(e.getFechaVencPlan()).isEqualTo(HOY);
    }

    @Test
    @DisplayName("Trial vencido con suscripción ONVO dentro de la gracia: se espera el webhook del cobro")
    void conCobroOnvoEsperaWebhook() {
        Empresa e = empresaEnTrial(7, HOY.minusDays(3));
        when(empresaRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(e));
        when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.of(subOnvo("sub_1")));

        assertThat(service.cerrarTrial(7L, HOY)).isFalse();
        assertThat(e.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
        verify(empresaRepo, never()).save(any());
    }

    @Test
    @DisplayName("Con suscripción ONVO pero sin cobro tras la gracia (8 días): VENCIDO")
    void conCobroOnvoPasadaLaGracia() {
        Empresa e = empresaEnTrial(7, HOY.minusDays(9));
        when(empresaRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(e));
        when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.of(subOnvo("sub_1")));

        assertThat(service.cerrarTrial(7L, HOY)).isTrue();
        assertThat(e.getEstadoPlan()).isEqualTo("VENCIDO");
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
