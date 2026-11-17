package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import com.hotclick.exception.EmpresaPendienteAprobacionException;
import com.hotclick.model.Suscripcion;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tope de 70 del plan Emprendedor: el trial legado de 14 días (POST /api/billing/trial) no deja entrar gratis a
 * quien quedó sin puesto (el 71 en adelante) ni pisa el trial de quien ya tuvo puesto.
 */
@ExtendWith(MockitoExtension.class)
class TrialLegadoSinCupoTest {

    @Mock SuscripcionRepository suscripcionRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock PlanRepository planRepo;
    @InjectMocks SuscripcionBillingService service;

    private void rechazaSinTocarNada(Empresa e) {
        when(empresaRepo.findByIdForUpdate(9L)).thenReturn(Optional.of(e));
        assertThatThrownBy(() -> service.iniciarTrial(9L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("prueba gratuita");
        verify(suscripcionRepo, never()).save(any());
        verify(empresaRepo, never()).save(any());
        verify(empresaRepo).findByIdForUpdate(9L);
        verify(empresaRepo, never()).findById(any());
        verifyNoInteractions(planRepo);
    }

    @Test
    void negocioSinCupo_requiereMembresia_noRecibeTrial() {
        Empresa e = new Empresa();
        e.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        rechazaSinTocarNada(e);
    }

    @Test
    void negocioPendienteDeCupo_noRecibeTrial() {
        Empresa e = new Empresa();
        e.setEstadoPlan(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        rechazaSinTocarNada(e);
    }

    @Test
    void negocioQueYaTuvoPuestoDeTrial_noRecibeOtroTrial() {
        Empresa e = new Empresa();
        e.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        e.setTrialEmprendedorPos(5);
        rechazaSinTocarNada(e);
    }

    /** Fail-closed: el set de estados elegibles está vacío; ningún estado_plan (ni null) recibe 14 días nuevos. */
    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"NO_EXISTE", "VENCIDO", "PAST_DUE", "ACTIVO", "activo", "vencido", "TRIAL", "PRUEBA_CERRADA",
        "REQUIERE_MEMBRESIA", "PENDIENTE_CUPO", ""})
    void estadoPlanNoElegible_sinPuesto_rechaza(String estadoPlan) {
        Empresa e = new Empresa();
        e.setEstadoPlan(estadoPlan);
        e.setTrialEmprendedorPos(null);
        rechazaSinTocarNada(e);
    }

    @org.junit.jupiter.api.Test
    void conjuntoElegibleVacio() {
        assertThat(SuscripcionBillingService.ESTADOS_ELEGIBLES_TRIAL_LEGADO).isEmpty();
    }

    @Test
    void noAprobada_409_antesDelAllowList() {
        Empresa e = new Empresa();
        e.setEstadoEmpresa("PENDIENTE_APROBACION");
        e.setEstadoPlan("VENCIDO");
        when(empresaRepo.findByIdForUpdate(9L)).thenReturn(Optional.of(e));
        assertThatThrownBy(() -> service.iniciarTrial(9L)).isInstanceOf(EmpresaPendienteAprobacionException.class);
        verify(suscripcionRepo, never()).save(any());
        verify(empresaRepo, never()).save(any());
    }

    @Test
    void suscripcionActiva_seDevuelveIdempotente_aunqueEstadoNoElegible() {
        Empresa e = new Empresa();
        e.setEstadoPlan("VENCIDO");
        Suscripcion existente = new Suscripcion();
        when(empresaRepo.findByIdForUpdate(9L)).thenReturn(Optional.of(e));
        when(suscripcionRepo.findActivaByEmpresaId(9L)).thenReturn(Optional.of(existente));
        assertThat(service.iniciarTrial(9L)).isSameAs(existente);
        verify(suscripcionRepo, never()).save(any());
        verify(empresaRepo, never()).findById(any());
    }
}
