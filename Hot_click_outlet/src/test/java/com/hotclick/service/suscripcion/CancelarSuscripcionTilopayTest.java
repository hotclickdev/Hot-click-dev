package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.StripeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Bajar a Emprendedor (CRC 0) ya no pasa por /cambiar-plan (precio 0 da 409 PLAN_SIN_PRECIO):
 * se hace con POST /api/billing/cancelar. Una suscripción cobrada por Tilopay no tiene id de Stripe ni ONVO.
 * Nota: /cancelar solo admite el rol EMPRENDEDOR (@PreAuthorize), no ADMIN.
 */
@DisplayName("Cancelar suscripción Tilopay = degradar a Emprendedor")
class CancelarSuscripcionTilopayTest {

    private SuscripcionBillingService servicio(SuscripcionRepository repo, StripeService stripe, SuscripcionPlanSupport plan) {
        SuscripcionBillingService s = new SuscripcionBillingService();
        ReflectionTestUtils.setField(s, "suscripcionRepo", repo);
        ReflectionTestUtils.setField(s, "stripeService", stripe);
        ReflectionTestUtils.setField(s, "planSupport", plan);
        ReflectionTestUtils.setField(s, "self", s);
        return s;
    }

    private static Suscripcion subTilopay(Empresa e) {
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setEstado("ACTIVO"); // pagada por Tilopay: sin stripe/onvo ids
        return sub;
    }

    @Test
    void inmediata_degradaAPlanBase() throws Exception {
        var repo = mock(SuscripcionRepository.class);
        var stripe = mock(StripeService.class);
        var plan = mock(SuscripcionPlanSupport.class);
        Empresa e = new Empresa();
        Suscripcion sub = subTilopay(e);
        when(repo.findActivaByEmpresaId(5L)).thenReturn(Optional.of(sub));

        servicio(repo, stripe, plan).cancelar(5L, true);

        verify(stripe).cancelarSuscripcion(null, true); // sin id externo: no-op del cliente Stripe
        assertThat(sub.getEstado()).isEqualTo("CANCELADO");
        verify(plan).degradarAPlanBase(e);
        verify(repo).save(sub);
    }

    @Test
    void alVencer_soloMarca_noDegradaTodavia() throws Exception {
        var repo = mock(SuscripcionRepository.class);
        var stripe = mock(StripeService.class);
        var plan = mock(SuscripcionPlanSupport.class);
        Suscripcion sub = subTilopay(new Empresa());
        when(repo.findActivaByEmpresaId(5L)).thenReturn(Optional.of(sub));

        servicio(repo, stripe, plan).cancelar(5L, false);

        assertThat(sub.getCancelarAlVencer()).isTrue();
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
        verifyNoInteractions(plan);
    }
}
