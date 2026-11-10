package com.hotclick.service.suscripcion;

import com.hotclick.controller.SuscripcionController;
import com.hotclick.exception.CancelacionOnvoNoDisponibleException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.OnvoService;
import com.hotclick.service.StripeService;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.billing.BillingLedgerWriter;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.service.onvo.OnvoBillingClient.ResultadoCancelacion;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InOrder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Seguimiento de Seguridad sobre el MEDIO (Opción A): lock + relectura al aplicar la cancelación, el cobro conserva la
 * cancelación al vencer, renovación fallida no toca una fila CANCELADO, revisión manual en los caminos de alerta, y
 * /cambiar-plan (bajar a gratis) responde 503 CANCELACION_ONVO_NO_DISPONIBLE.
 */
@DisplayName("MEDIO Seguridad: seguimiento (lock, cancelarAlVencer, renovación fallida, revisión manual, 503 en cambiar-plan)")
class CancelarTrialOnvoSeguimientoSeguridadTest {

    private static final Long EMPRESA = 7L;
    private static final Long FILA = 70L;
    private static final String SUB = "clsubtrial0001";

    @AfterEach
    void limpiar() { TenantContext.clear(); }

    // ── (1) aplicarCancelacion bloquea la fila y vuelve a revisar ───────────────────────────────────

    private SuscripcionRepository repo;
    private SuscripcionPlanSupport planSupport;
    private OnvoBillingClient onvo;
    private SuscripcionBillingService billing;

    @BeforeEach
    void setUp() {
        repo = mock(SuscripcionRepository.class);
        planSupport = mock(SuscripcionPlanSupport.class);
        onvo = mock(OnvoBillingClient.class);
        billing = new SuscripcionBillingService();
        ReflectionTestUtils.setField(billing, "suscripcionRepo", repo);
        ReflectionTestUtils.setField(billing, "stripeService", mock(StripeService.class));
        ReflectionTestUtils.setField(billing, "planSupport", planSupport);
        ReflectionTestUtils.setField(billing, "onvoBilling", onvo);
        ReflectionTestUtils.setField(billing, "self", billing);
    }

    private static Suscripcion trial(String onvoId) {
        Empresa e = new Empresa();
        e.setId(EMPRESA);
        e.setEstadoPlan("TRIAL");
        Plan p = new Plan();
        p.setNombre("EMPRENDEDOR");
        Suscripcion sub = new Suscripcion();
        ReflectionTestUtils.setField(sub, "id", FILA);
        sub.setEmpresa(e);
        sub.setPlan(p);
        sub.setEstado("TRIAL");
        sub.setOnvoSubscriptionId(onvoId);
        sub.setCancelarAlVencer(false);
        return sub;
    }

    @ParameterizedTest(name = "inmediata={0}: la cancelación local se aplica sobre la fila bloqueada (findByIdForUpdate)")
    @ValueSource(booleans = {true, false})
    void aplicaSobreFilaBloqueada(boolean inmediata) throws Exception {
        Suscripcion leida = trial(SUB);
        Suscripcion bloqueada = trial(SUB);
        when(repo.findActivaByEmpresaId(EMPRESA)).thenReturn(Optional.of(leida));
        when(repo.findByIdForUpdate(FILA)).thenReturn(Optional.of(bloqueada));
        when(onvo.cancelarPorNegocio(SUB, inmediata))
            .thenReturn(inmediata ? ResultadoCancelacion.CANCELADA : ResultadoCancelacion.PROGRAMADA);

        billing.cancelar(EMPRESA, inmediata);

        InOrder orden = inOrder(onvo, repo);
        orden.verify(onvo).cancelarPorNegocio(SUB, inmediata);
        orden.verify(repo).findByIdForUpdate(FILA);
        orden.verify(repo).save(bloqueada);
        if (inmediata) assertThat(bloqueada.getEstado()).isEqualTo("CANCELADO");
        else assertThat(bloqueada.getCancelarAlVencer()).isTrue();
        assertThat(leida.getEstado()).isEqualTo("TRIAL"); // la copia sin lock no se escribe
    }

    @ParameterizedTest(name = "inmediata={0}: subida pendiente aparece bajo el lock → 503, sin cancelar local y revisión manual")
    @ValueSource(booleans = {true, false})
    void subidaPendienteBajoLock_503(boolean inmediata) {
        Suscripcion leida = trial(SUB);
        Suscripcion bloqueada = trial(SUB);
        bloqueada.setOnvoSubNuevaPendiente("clsubnueva0003");
        when(repo.findActivaByEmpresaId(EMPRESA)).thenReturn(Optional.of(leida));
        when(repo.findByIdForUpdate(FILA)).thenReturn(Optional.of(bloqueada));
        when(onvo.cancelarPorNegocio(SUB, inmediata))
            .thenReturn(inmediata ? ResultadoCancelacion.CANCELADA : ResultadoCancelacion.PROGRAMADA);

        assertThatThrownBy(() -> billing.cancelar(EMPRESA, inmediata))
            .isInstanceOf(CancelacionOnvoNoDisponibleException.class);

        assertThat(bloqueada.getEstado()).isEqualTo("TRIAL");
        assertThat(bloqueada.getCancelarAlVencer()).isFalse();
        assertThat(bloqueada.getFechaCancelacion()).isNull();
        verify(repo, never()).save(bloqueada);
        verifyNoInteractions(planSupport);
        // (d) ONVO ya canceló: además del log, la fila queda marcada para revisión manual (TX aparte).
        assertThat(leida.getOnvoRevisionManualDesde()).isNotNull();
        verify(repo).save(leida);
        assertThat(leida.getEstado()).isEqualTo("TRIAL");
    }

    @Test
    @DisplayName("La fila bloqueada ya no está vigente (CANCELADO por webhook) → 503 y revisión manual")
    void filaBloqueadaYaCancelada_503() {
        Suscripcion leida = trial(SUB);
        Suscripcion bloqueada = trial(SUB);
        bloqueada.setEstado("CANCELADO");
        when(repo.findActivaByEmpresaId(EMPRESA)).thenReturn(Optional.of(leida));
        when(repo.findByIdForUpdate(FILA)).thenReturn(Optional.of(bloqueada));
        when(onvo.cancelarPorNegocio(SUB, true)).thenReturn(ResultadoCancelacion.CANCELADA);

        assertThatThrownBy(() -> billing.cancelar(EMPRESA, true))
            .isInstanceOf(CancelacionOnvoNoDisponibleException.class);
        verify(repo, never()).save(bloqueada);
        verifyNoInteractions(planSupport);
        assertThat(leida.getOnvoRevisionManualDesde()).isNotNull();
    }

    @Test
    @DisplayName("ONVO no confirma → 503 y CERO cambios (ni lock ni revisión manual: no se canceló nada en ONVO)")
    void onvoNoConfirma_ceroCambios() {
        Suscripcion leida = trial(SUB);
        when(repo.findActivaByEmpresaId(EMPRESA)).thenReturn(Optional.of(leida));
        when(onvo.cancelarPorNegocio(SUB, true)).thenThrow(new IllegalStateException("ONVO no confirmó"));

        assertThatThrownBy(() -> billing.cancelar(EMPRESA, true))
            .isInstanceOf(CancelacionOnvoNoDisponibleException.class);
        verify(repo, never()).findByIdForUpdate(anyLong());
        verify(repo, never()).save(any());
        assertThat(leida.getOnvoRevisionManualDesde()).isNull();
    }

    // ── (2), (d), (e): webhook ──────────────────────────────────────────────────────────────────────

    private SuscripcionOnvoChangeService servicioWebhook(SuscripcionRepository subs, BillingLedgerWriter ledger) {
        PlanRepository planes = mock(PlanRepository.class);
        Plan pyme = new Plan();
        pyme.setNombre("PYME");
        when(planes.findByNombre("PYME")).thenReturn(Optional.of(pyme));
        SuscripcionOnvoChangeService svc = new SuscripcionOnvoChangeService(subs, mock(EmpresaRepository.class), planes,
            mock(OnvoBillingClient.class), mock(OnvoService.class), mock(SuscripcionPlanSupport.class), null);
        ReflectionTestUtils.setField(svc, "ledgerWriter", ledger);
        ReflectionTestUtils.setField(svc, "preciosPlanes", new PreciosPlanesConfig("9", "24", "49", "usd"));
        return svc;
    }

    @Test
    @DisplayName("(2)+(d) Cobro verificado sobre una fila con cancelarAlVencer=true: la conserva y marca revisión manual")
    void cobroConservaCancelacionAlVencer() {
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        Suscripcion sub = trial(SUB);
        sub.setCancelarAlVencer(true);
        when(subs.findByOnvoSubscriptionIdForUpdate(SUB)).thenReturn(Optional.of(sub));

        servicioWebhook(subs, mock(BillingLedgerWriter.class))
            .procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 10), "clinv0001");

        assertThat(sub.getCancelarAlVencer()).isTrue();
        assertThat(sub.getOnvoRevisionManualDesde()).isNotNull();
        assertThat(sub.getEstado()).isEqualTo("ACTIVO"); // el período pagado se aplica; la baja al vencer se mantiene
        verify(subs).save(sub);
    }

    @Test
    @DisplayName("(2) Cobro verificado sin cancelación pendiente: cancelarAlVencer queda false y sin revisión manual")
    void cobroSinCancelacionPendiente_igualQueAntes() {
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        Suscripcion sub = trial(SUB);
        sub.setCancelarAlVencer(null);
        when(subs.findByOnvoSubscriptionIdForUpdate(SUB)).thenReturn(Optional.of(sub));

        servicioWebhook(subs, mock(BillingLedgerWriter.class))
            .procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 10), "clinv0002");

        assertThat(sub.getCancelarAlVencer()).isFalse();
        assertThat(sub.getOnvoRevisionManualDesde()).isNull();
    }

    @Test
    @DisplayName("(2)+(d) Activación del trial con tarjeta conserva cancelarAlVencer y marca revisión manual")
    void trialConservaCancelacionAlVencer_yMarcaRevision() {
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        Suscripcion sub = trial(SUB);
        sub.setCancelarAlVencer(true);
        when(subs.findByOnvoSubscriptionIdForUpdate(SUB)).thenReturn(Optional.of(sub));

        assertThat(servicioWebhook(subs, mock(BillingLedgerWriter.class))
            .procesarTrialOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 11, 24))).isTrue();

        assertThat(sub.getCancelarAlVencer()).isTrue();
        assertThat(sub.getOnvoRevisionManualDesde()).isNotNull();
    }

    @Test
    @DisplayName("(e)+(d) Renovación fallida sobre una fila CANCELADO: no pasa a PAST_DUE, sin ledger, revisión manual")
    void renovacionFallidaSobreCancelada_seIgnora() {
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        BillingLedgerWriter ledger = mock(BillingLedgerWriter.class);
        Suscripcion sub = trial(SUB);
        sub.setEstado("CANCELADO");
        sub.getEmpresa().setEstadoPlan("CANCELADO");
        when(subs.findByOnvoSubscriptionId(SUB)).thenReturn(Optional.of(sub));

        servicioWebhook(subs, ledger).procesarRenovacionFallida(SUB);

        assertThat(sub.getEstado()).isEqualTo("CANCELADO");
        assertThat(sub.getFechaFin()).isNull();
        assertThat(sub.getEmpresa().getEstadoPlan()).isEqualTo("CANCELADO");
        assertThat(sub.getOnvoRevisionManualDesde()).isNotNull();
        verify(ledger, never()).registrar(any(), any(), anyString(), anyString(), anyString(), any(), any(), any());
    }

    @Test
    @DisplayName("(e) Control: renovación fallida sobre una fila TRIAL sigue pasando a PAST_DUE como antes")
    void renovacionFallidaSobreTrial_pastDueComoAntes() {
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        Suscripcion sub = trial(SUB);
        when(subs.findByOnvoSubscriptionId(SUB)).thenReturn(Optional.of(sub));

        servicioWebhook(subs, mock(BillingLedgerWriter.class)).procesarRenovacionFallida(SUB);

        assertThat(sub.getEstado()).isEqualTo("PAST_DUE");
        assertThat(sub.getOnvoRevisionManualDesde()).isNull();
    }

    // ── (a) /cambiar-plan: bajar a gratis sin confirmación de ONVO → 503 ────────────────────────────

    @Test
    @DisplayName("(a) POST /api/billing/cambiar-plan/{id}: CancelacionOnvoNoDisponible → 503 CANCELACION_ONVO_NO_DISPONIBLE")
    void cambiarPlan_503() throws Exception {
        SuscripcionService svc = mock(SuscripcionService.class);
        when(svc.cambiarPlanOnvo(EMPRESA, 1L)).thenThrow(new CancelacionOnvoNoDisponibleException());
        var guard = mock(com.hotclick.security.PropietarioGuard.class);
        when(guard.puedeGestionarEmpresa(any())).thenReturn(true);
        PlanRepository planRepo = mock(PlanRepository.class);
        when(planRepo.findById(1L)).thenReturn(Optional.empty());
        SuscripcionController c = new SuscripcionController(svc, planRepo, mock(com.hotclick.service.auth.AuthSupport.class),
            mock(CobroSuscripcionService.class), new PreciosPlanesConfig("9", "24", "49"), guard);
        TenantContext.set(EMPRESA);

        MockMvcBuilders.standaloneSetup(c).build()
            .perform(post("/api/billing/cambiar-plan/1"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.codigo").value("CANCELACION_ONVO_NO_DISPONIBLE"))
            .andExpect(jsonPath("$.error").value(CancelacionOnvoNoDisponibleException.MENSAJE));
    }
}
