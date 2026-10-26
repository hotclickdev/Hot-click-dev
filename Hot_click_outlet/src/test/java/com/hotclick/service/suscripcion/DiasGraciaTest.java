package com.hotclick.service.suscripcion;

import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Cobro 12-oct: 7 días de gracia antes de vencer una mensualidad impaga")
class DiasGraciaTest {

    @Mock SuscripcionRepository suscripcionRepo;
    @Mock SuscripcionPlanSupport planSupport;
    @Mock com.hotclick.service.onvo.OnvoBillingClient onvoBilling; // sin llave=false → hay cobro
    @InjectMocks SuscripcionRenewalService service;

    @Test
    void pastDueSoloVenceTrasLaGracia() {
        ReflectionTestUtils.setField(service, "diasGracia", 7);
        LocalDate limite = LocalDate.now(Constants.ZONA_CR).minusDays(7);
        com.hotclick.model.Empresa e = new com.hotclick.model.Empresa();
        e.setId(5L);
        com.hotclick.model.Suscripcion s = new com.hotclick.model.Suscripcion();
        s.setEmpresa(e);
        when(suscripcionRepo.findPastDueOnvoVencidos(eq(limite), any())).thenReturn(List.of(s));
        service.expirarPastDueVencidos();
        verify(suscripcionRepo).findPastDueOnvoVencidos(eq(limite), any());
    }
}
