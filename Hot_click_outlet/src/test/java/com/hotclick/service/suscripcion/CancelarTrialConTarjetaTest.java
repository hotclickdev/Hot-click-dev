package com.hotclick.service.suscripcion;

import com.hotclick.exception.CambioPlanRequiereSolicitudException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.StripeService;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** QA final U1c-c: un trial ONVO con tarjeta (sub local ACTIVO por la factura $0) se cancela; un plan cobrado no. */
@DisplayName("Cancelar trial ONVO con tarjeta (U1c-c)")
class CancelarTrialConTarjetaTest {

    private static final String ONVO_SUB = "sub_test_trial";

    private SuscripcionBillingService servicio(SuscripcionRepository repo, OnvoBillingClient onvo) {
        SuscripcionBillingService s = new SuscripcionBillingService();
        ReflectionTestUtils.setField(s, "suscripcionRepo", repo);
        ReflectionTestUtils.setField(s, "stripeService", mock(StripeService.class));
        ReflectionTestUtils.setField(s, "planSupport", mock(SuscripcionPlanSupport.class));
        ReflectionTestUtils.setField(s, "onvoBilling", onvo);
        ReflectionTestUtils.setField(s, "self", s);
        return s;
    }

    private static Suscripcion sub(String plan, LocalDate trialEnd) {
        Empresa e = new Empresa();
        e.setEstadoPlan("ACTIVO");
        Plan p = new Plan();
        p.setNombre(plan);
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setEstado("ACTIVO");
        sub.setPlan(p);
        sub.setOnvoSubscriptionId(ONVO_SUB);
        sub.setTrialEnd(trialEnd);
        ReflectionTestUtils.setField(sub, "id", 9L);
        return sub;
    }

    private static SuscripcionRepository repo(Suscripcion sub) {
        var repo = mock(SuscripcionRepository.class);
        when(repo.idsActivasByEmpresaId(5L)).thenReturn(java.util.List.of(9L));
        when(repo.findByIdForUpdate(9L)).thenReturn(Optional.of(sub));
        when(repo.findActivaByEmpresaId(5L)).thenReturn(Optional.of(sub));
        return repo;
    }

    @Test
    @DisplayName("ACTIVO + trial_end futuro + id ONVO: cancelar llama a ONVO y no da 422")
    void trialConTarjeta_seCancela() throws Exception {
        Suscripcion s = sub("PYME", LocalDate.now().plusDays(80));
        var onvo = mock(OnvoBillingClient.class);
        when(onvo.cancelarPorNegocio(eq(ONVO_SUB), anyBoolean()))
            .thenReturn(OnvoBillingClient.ResultadoCancelacion.CANCELADA);

        servicio(repo(s), onvo).cancelar(5L, false);

        verify(onvo).cancelarPorNegocio(ONVO_SUB, false);
    }

    @Test
    @DisplayName("Plan pagado de verdad (trial_end pasado o vacío): sigue 422 y no se llama a ONVO")
    void planCobrado_sigue422() throws Exception {
        for (LocalDate fin : new LocalDate[] {null, LocalDate.now().minusDays(1)}) {
            Suscripcion s = sub("PYME", fin);
            var onvo = mock(OnvoBillingClient.class);
            assertThatThrownBy(() -> servicio(repo(s), onvo).cancelar(5L, true))
                .isInstanceOf(CambioPlanRequiereSolicitudException.class);
            verifyNoInteractions(onvo);
            assertThat(s.getEstado()).isEqualTo("ACTIVO");
        }
    }

    @Test
    @DisplayName("PAST_DUE con trial_end futuro (mora real): no se trata como trial")
    void pastDue_sigue422() {
        Suscripcion s = sub("NEGOCIO_PLUS", LocalDate.now().plusDays(5));
        s.setEstado("PAST_DUE");
        var onvo = mock(OnvoBillingClient.class);
        assertThatThrownBy(() -> servicio(repo(s), onvo).cancelar(5L, false))
            .isInstanceOf(CambioPlanRequiereSolicitudException.class);
        verifyNoInteractions(onvo);
    }
}
