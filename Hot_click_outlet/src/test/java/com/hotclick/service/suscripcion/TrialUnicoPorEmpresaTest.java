package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
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

/** P10-03: una empresa cuyo trial expiró o se canceló no puede iniciar otro. */
@ExtendWith(MockitoExtension.class)
class TrialUnicoPorEmpresaTest {

    @Mock SuscripcionRepository suscripcionRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock PlanRepository planRepo;
    @InjectMocks SuscripcionBillingService service;

    @Test
    void segundoTrial_rechazado() {
        when(empresaRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(new Empresa()));
        when(suscripcionRepo.findActivaByEmpresaId(7L)).thenReturn(Optional.empty());

        // Con el set de elegibles vacío el rechazo ocurre antes de llegar al chequeo de "ya usó su prueba"
        // (que queda como defensa si un día se agrega un estado elegible).
        assertThatThrownBy(() -> service.iniciarTrial(7L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("prueba gratuita");
        verify(suscripcionRepo, never()).save(any());
        verify(empresaRepo, never()).save(any());
    }
}
