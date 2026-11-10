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
        conLock(repo, sub);

        assertThatThrownBy(() -> servicio(repo, stripe, plan).cancelar(5L, false))
            .isInstanceOf(CambioPlanRequiereSolicitudException.class);

        verifyNoInteractions(stripe);
        assertThat(sub.getCancelarAlVencer()).isNotEqualTo(Boolean.TRUE);
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
    }

    /** La fila vigente se carga con FOR UPDATE a partir del id (sin una instancia leída antes sin lock). */
    private static void conLock(SuscripcionRepository repo, Suscripcion sub) {
        ReflectionTestUtils.setField(sub, "id", 9L);
        when(repo.idsActivasByEmpresaId(5L)).thenReturn(java.util.List.of(9L));
        when(repo.findByIdForUpdate(9L)).thenReturn(Optional.of(sub));
        when(repo.findActivaByEmpresaId(5L)).thenReturn(Optional.of(sub));
    }

    private static Suscripcion subConPlan(String estado, String planNombre) {
        Empresa e = new Empresa();
        e.setEstadoPlan(estado);
        Plan p = new Plan();
        p.setNombre(planNombre);
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setEstado(estado);
        sub.setPlan(p);
        return sub;
    }

    @Test
    @DisplayName("BAJO #547: planPagadoNoSeCancelaSolo decide con la fila bloqueada (FOR UPDATE), no con la lectura sin lock")
    void planPagado_leeConLock() throws Exception {
        var repo = mock(SuscripcionRepository.class);
        var stripe = mock(StripeService.class);
        var plan = mock(SuscripcionPlanSupport.class);
        // Sin lock se vería un Emprendedor sin cobro; la fila bloqueada ya es PYME cobrado (un webhook la cambió).
        Suscripcion vieja = subConPlan("TRIAL", "EMPRENDEDOR");
        ReflectionTestUtils.setField(vieja, "id", 9L);
        Suscripcion bloqueada = subConPlan("ACTIVO", "PYME");
        ReflectionTestUtils.setField(bloqueada, "id", 9L);
        when(repo.findActivaByEmpresaId(5L)).thenReturn(Optional.of(vieja));
        when(repo.idsActivasByEmpresaId(5L)).thenReturn(java.util.List.of(9L));
        when(repo.findByIdForUpdate(9L)).thenReturn(Optional.of(bloqueada));

        assertThat(servicio(repo, stripe, plan).planPagadoNoSeCancelaSolo(5L)).isTrue();
        verify(repo).findByIdForUpdate(9L);
        verify(repo, never()).findActivaByEmpresaId(5L);

        org.springframework.transaction.annotation.Transactional t = SuscripcionBillingService.class
            .getMethod("planPagadoNoSeCancelaSolo", Long.class)
            .getAnnotation(org.springframework.transaction.annotation.Transactional.class);
        assertThat(t).isNotNull();
        assertThat(t.readOnly()).as("FOR UPDATE no corre en una transacción readOnly").isFalse();
    }

    @Test
    @DisplayName("BAJO #547: plan fuera de ORDEN_PLANES cobrado → bloqueado (422), sin Stripe ni cambios")
    void planFueraDeOrden_failClosed() {
        var repo = mock(SuscripcionRepository.class);
        var stripe = mock(StripeService.class);
        var plan = mock(SuscripcionPlanSupport.class);
        Suscripcion sub = subConPlan("ACTIVO", "PLAN_RARO");
        conLock(repo, sub);

        assertThatThrownBy(() -> servicio(repo, stripe, plan).cancelar(5L, true))
            .isInstanceOf(CambioPlanRequiereSolicitudException.class);
        verifyNoInteractions(stripe, plan);
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");

        assertThat(SuscripcionOnvoChangeService.cancelacionDePlanPagado("PLAN_RARO", "ACTIVO", null, false)).isTrue();
        assertThat(SuscripcionOnvoChangeService.cancelacionDePlanPagado(null, "PAST_DUE", null, false)).isTrue();
        assertThat(SuscripcionOnvoChangeService.bajadaDePlanPagado("PLAN_RARO", "PYME", "ACTIVO", null)).isTrue();
        assertThat(SuscripcionOnvoChangeService.bajadaDePlanPagado("PYME", "PLAN_RARO", null, "ACTIVO")).isTrue();
        // Sin período cobrado no hay nada pagado que perder: no cambia.
        assertThat(SuscripcionOnvoChangeService.cancelacionDePlanPagado("PLAN_RARO", "TRIAL", "TRIAL", false)).isFalse();
        assertThat(SuscripcionOnvoChangeService.bajadaDePlanPagado("PLAN_RARO", "PYME", "TRIAL", "TRIAL")).isFalse();
        // Los planes conocidos siguen igual.
        assertThat(SuscripcionOnvoChangeService.cancelacionDePlanPagado("EMPRENDEDOR", "ACTIVO", null, false)).isFalse();
        assertThat(SuscripcionOnvoChangeService.bajadaDePlanPagado("PYME", "NEGOCIO_PLUS", "ACTIVO", null)).isFalse();
    }

    @Test
    @DisplayName("BAJO #547: /cancelar en TRIAL (PYME del trial, sin cobro) se cancela solo, sin solicitud")
    void cancelarEnTrial() throws Exception {
        var repo = mock(SuscripcionRepository.class);
        var stripe = mock(StripeService.class);
        var plan = mock(SuscripcionPlanSupport.class);
        Suscripcion sub = subConPlan("TRIAL", "PYME");
        conLock(repo, sub);

        servicio(repo, stripe, plan).cancelar(5L, false);
        assertThat(sub.getCancelarAlVencer()).isTrue();
        assertThat(sub.getEstado()).isEqualTo("TRIAL");
        verifyNoInteractions(plan);

        servicio(repo, stripe, plan).cancelar(5L, true);
        assertThat(sub.getEstado()).isEqualTo("CANCELADO");
        verify(plan).degradarAPlanBase(sub.getEmpresa());
        verify(repo, times(2)).findByIdForUpdate(9L);
    }
}
