package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@DisplayName("Auditor 5: S-02 (billing ONVO verificado por GET)")
class BillingOnvoS02Test {

    @Test
    @DisplayName("S-02: sin llave, las consultas de verificación fallan cerradas (no se inventa respuesta)")
    void verificacionSinLlaveFallaCerrada() {
        OnvoBillingClient client = new OnvoBillingClient(new RestTemplate());
        assertThatThrownBy(() -> client.obtenerSuscripcion("sub_1")).isInstanceOf(IllegalStateException.class);
        assertThat(client.modoEsperado()).isNull();
    }

    private SuscripcionOnvoChangeService servicio(SuscripcionRepository subs, EmpresaRepository emps, PlanRepository planes,
                                                  OnvoBillingClient onvo) {
        return new SuscripcionOnvoChangeService(subs, emps, planes, onvo, mock(OnvoService.class),
            mock(SuscripcionPlanSupport.class), null);
    }

    @Test
    @DisplayName("S-02/S-08: pago verificado aplica el plan y el fin de período confirmados por ONVO")
    void pagoVerificadoAplicaPeriodoOnvo() {
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        EmpresaRepository emps = mock(EmpresaRepository.class);
        PlanRepository planes = mock(PlanRepository.class);
        Plan plus = new Plan(); plus.setNombre("NEGOCIO_PLUS");
        when(planes.findByNombre("NEGOCIO_PLUS")).thenReturn(Optional.of(plus));
        Empresa e = new Empresa(); e.setId(10L);
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setEstado("PAST_DUE");
        when(subs.findByOnvoSubscriptionIdForUpdate("clsub")).thenReturn(Optional.of(sub));
        LocalDate fin = LocalDate.of(2026, 12, 1);
        servicio(subs, emps, planes, mock(OnvoBillingClient.class)).procesarPagoOnvoVerificado("clsub", "NEGOCIO_PLUS", fin);
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
        assertThat(sub.getFechaFin()).isEqualTo(fin);
        assertThat(e.getPlanSaas()).isEqualTo("NEGOCIO_PLUS");
        assertThat(e.getFechaVencPlan()).isEqualTo(fin);
    }
}
