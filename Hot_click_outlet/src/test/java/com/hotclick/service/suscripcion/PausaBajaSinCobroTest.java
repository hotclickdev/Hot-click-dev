package com.hotclick.service.suscripcion;

import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Auditor 5 S-01: sin forma de pagar no se baja el plan de un PAST_DUE vencido")
class PausaBajaSinCobroTest {

    @Mock SuscripcionRepository suscripcionRepo;
    @Mock SuscripcionPlanSupport planSupport;
    @Mock OnvoBillingClient onvoBilling;
    @InjectMocks SuscripcionRenewalService service;

    private void sinDegradar() {
        ReflectionTestUtils.setField(service, "diasGracia", 7);
        assertThat(service.expirarPastDueVencidos()).isZero();
        verify(suscripcionRepo, never()).findEmpresaIdsPastDueVencidos(any());
        verify(suscripcionRepo, never()).expirarPastDueBatch(any());
        verifyNoInteractions(planSupport);
    }

    @Test @DisplayName("Sin llave ONVO: no degrada")
    void sinLlave() { when(onvoBilling.sinLlave()).thenReturn(true); sinDegradar(); }

    @Test @DisplayName("ONVO en mock: no degrada")
    void mock() { when(onvoBilling.isMockMode()).thenReturn(true); sinDegradar(); }

    @Test @DisplayName("Billing ONVO deshabilitado: no degrada")
    void deshabilitado() { when(onvoBilling.isBillingDeshabilitado()).thenReturn(true); sinDegradar(); }

    @Test @DisplayName("Sin cliente ONVO en el contexto: no degrada (fail-closed)")
    void sinCliente() { ReflectionTestUtils.setField(service, "onvoBilling", null); sinDegradar(); }
}
