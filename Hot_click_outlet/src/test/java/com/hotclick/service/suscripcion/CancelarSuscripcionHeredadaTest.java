package com.hotclick.service.suscripcion;

import com.hotclick.exception.CambioPlanRequiereSolicitudException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.StripeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.*;

/**
 * Bajar a Emprendedor (CRC 0) ya no pasa por /cambiar-plan (precio 0 da 409 PLAN_SIN_PRECIO):
 * se hace con POST /api/billing/cancelar. Una suscripción heredada (pasarela previa) no tiene id de Stripe ni ONVO.
 * Nota: /cancelar solo admite el rol EMPRENDEDOR (@PreAuthorize), no ADMIN.
 */
@DisplayName("Cancelar suscripción heredada = degradar a Emprendedor")
class CancelarSuscripcionHeredadaTest {

    private SuscripcionBillingService servicio(SuscripcionRepository repo, StripeService stripe, SuscripcionPlanSupport plan) {
        SuscripcionBillingService s = new SuscripcionBillingService();
        ReflectionTestUtils.setField(s, "suscripcionRepo", repo);
        ReflectionTestUtils.setField(s, "stripeService", stripe);
        ReflectionTestUtils.setField(s, "planSupport", plan);
        ReflectionTestUtils.setField(s, "self", s);
        return s;
    }

    private static Suscripcion subHeredada(Empresa e) {
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setEstado("ACTIVO"); // heredada: sin stripe/onvo ids
        return sub;
    }

    @Test
    void inmediata_degradaAPlanBase() throws Exception {
        var repo = mock(SuscripcionRepository.class);
        var stripe = mock(StripeService.class);
        var plan = mock(SuscripcionPlanSupport.class);
        Empresa e = new Empresa();
        Suscripcion sub = subHeredada(e);
        when(repo.findActivaByEmpresaId(5L)).thenReturn(Optional.of(sub));

        servicio(repo, stripe, plan).cancelar(5L, true);

        // Sin id externo no se llama a ningún cliente (antes se llamaba al no-op de Stripe con null: mismo efecto).
        verify(stripe, never()).cancelarSuscripcion(any(), anyBoolean());
        assertThat(sub.getEstado()).isEqualTo("CANCELADO");
        verify(plan).degradarAPlanBase(e);
        verify(repo).save(sub);
    }

    @Test
    void alVencer_soloMarca_noDegradaTodavia() throws Exception {
        var repo = mock(SuscripcionRepository.class);
        var stripe = mock(StripeService.class);
        var plan = mock(SuscripcionPlanSupport.class);
        Suscripcion sub = subHeredada(new Empresa());
        when(repo.findActivaByEmpresaId(5L)).thenReturn(Optional.of(sub));

        servicio(repo, stripe, plan).cancelar(5L, false);

        assertThat(sub.getCancelarAlVencer()).isTrue();
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
        verifyNoInteractions(plan);
    }

    @Test
    @DisplayName("Plan pagado activo: 422 y no se llama a Stripe")
    void planPagado_noSeCancelaSolo() {
        var repo = mock(SuscripcionRepository.class);
        var stripe = mock(StripeService.class);
        var plan = mock(SuscripcionPlanSupport.class);
        Empresa e = new Empresa();
        e.setEstadoPlan("ACTIVO");
        e.setPlanSaas("NEGOCIO_PLUS");
        Plan plus = new Plan();
        plus.setNombre("NEGOCIO_PLUS");
        Suscripcion sub = subHeredada(e);
        sub.setPlan(plus);
        sub.setOnvoSubscriptionId("sub_plus");
        when(repo.findActivaByEmpresaId(5L)).thenReturn(Optional.of(sub));

        assertThatThrownBy(() -> servicio(repo, stripe, plan).cancelar(5L, false))
            .isInstanceOf(CambioPlanRequiereSolicitudException.class);

        verifyNoInteractions(stripe);
        assertThat(sub.getCancelarAlVencer()).isNotEqualTo(Boolean.TRUE);
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
    }
}
