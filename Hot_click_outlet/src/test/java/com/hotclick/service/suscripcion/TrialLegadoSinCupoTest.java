package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
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
        when(empresaRepo.findById(9L)).thenReturn(Optional.of(e));
        assertThatThrownBy(() -> service.iniciarTrial(9L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("prueba gratuita");
        verify(suscripcionRepo, never()).save(any());
        verify(empresaRepo, never()).save(any());
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
}
