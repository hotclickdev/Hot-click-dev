package com.hotclick.service.suscripcion;

import com.hotclick.controller.SuscripcionController;
import com.hotclick.exception.CancelacionConSubidaPendienteException;
import com.hotclick.exception.CancelacionOnvoNoDisponibleException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.StripeService;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.service.onvo.OnvoBillingClient.ResultadoCancelacion;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InOrder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.ResourceAccessException;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * MEDIO Seguridad (Opción A): cancelar un trial (o cualquier suscripción) con id ONVO cancela PRIMERO en ONVO,
 * fail-closed. Si ONVO falla, no responde o la respuesta es ambigua → 503 CANCELACION_ONVO_NO_DISPONIBLE y CERO
 * cambios locales. Sin id ONVO el comportamiento es el de antes. Nunca se usa el no-op de Stripe para ONVO.
 */
@DisplayName("MEDIO Seguridad: cancelar trial/suscripción ONVO es fail-closed y ONVO va primero")
class CancelarTrialOnvoFailClosedTest {

    private static final Long EMPRESA = 7L;
    private static final String SUB_ONVO = "clsubtrial0001";

    private SuscripcionRepository repo;
    private StripeService stripe;
    private SuscripcionPlanSupport planSupport;
    private OnvoBillingClient onvo;
    private SuscripcionBillingService billing;

    @BeforeEach
    void setUp() {
        repo = mock(SuscripcionRepository.class);
        stripe = mock(StripeService.class);
        planSupport = mock(SuscripcionPlanSupport.class);
        onvo = mock(OnvoBillingClient.class);
        billing = new SuscripcionBillingService();
        ReflectionTestUtils.setField(billing, "suscripcionRepo", repo);
        ReflectionTestUtils.setField(billing, "stripeService", stripe);
        ReflectionTestUtils.setField(billing, "planSupport", planSupport);
        ReflectionTestUtils.setField(billing, "onvoBilling", onvo);
        ReflectionTestUtils.setField(billing, "self", billing);
    }

    @AfterEach
    void limpiar() { TenantContext.clear(); }

    private static Plan plan(String nombre) {
        Plan p = new Plan();
        p.setNombre(nombre);
        return p;
    }

    /** Trial Emprendedor con tarjeta: fila creada por POST /api/billing/trial/tarjeta (asegurarSuscripcionTrial). */
    private static Suscripcion trialPorTarjeta() {
        Empresa e = new Empresa();
        e.setId(EMPRESA);
        e.setEstadoPlan("TRIAL");
        e.setPlanSaas("EMPRENDEDOR");
        e.setTrialEmprendedorHasta(LocalDate.now().plusDays(10));
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setPlan(plan("EMPRENDEDOR"));
        sub.setEstado("TRIAL");
        sub.setOnvoCustomerId("clcus0001");
        sub.setOnvoSubscriptionId(SUB_ONVO);
        sub.setOnvoPriceId("price_emprendedor");
        sub.setCancelarAlVencer(false);
        return sub;
    }

    /** Trial PYME con alta ONVO hecha por POST /api/billing/cambiar-plan/{id} desde el trial (plan pendiente). */
    private static Suscripcion trialPorCambiarPlan() {
        Empresa e = new Empresa();
        e.setId(EMPRESA);
        e.setEstadoPlan("TRIAL");
        e.setPlanSaas("PYME");
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setPlan(plan("PYME"));
        sub.setPlanPendiente(plan("NEGOCIO_PLUS"));
        sub.setEstado("TRIAL");
        sub.setTrialEnd(LocalDate.now().plusDays(10));
        sub.setOnvoCustomerId("clcus0002");
        sub.setOnvoSubscriptionId(SUB_ONVO);
        sub.setOnvoPriceId("price_plus");
        sub.setCancelarAlVencer(false);
        return sub;
    }

    private void filaActiva(Suscripcion sub) {
        when(repo.findActivaByEmpresaId(EMPRESA)).thenReturn(Optional.of(sub));
    }

    private static void assertIntacta(Suscripcion sub) {
        assertThat(sub.getEstado()).isEqualTo("TRIAL");
        assertThat(sub.getCancelarAlVencer()).isFalse();
        assertThat(sub.getFechaCancelacion()).isNull();
        assertThat(sub.getOnvoSubscriptionId()).isEqualTo(SUB_ONVO);
    }

    // ── Trial con tarjeta: ONVO antes que local ─────────────────────────────────────────────────────

    @Test
    @DisplayName("/trial/tarjeta + inmediata=true: DELETE en ONVO ANTES de guardar CANCELADO; Stripe no se usa")
    void trialTarjeta_inmediata_onvoAntesQueLocal() throws Exception {
        Suscripcion sub = trialPorTarjeta();
        filaActiva(sub);
        when(onvo.cancelarPorNegocio(SUB_ONVO, true)).thenReturn(ResultadoCancelacion.CANCELADA);

        assertThat(billing.cancelar(EMPRESA, true)).isTrue();

        InOrder orden = inOrder(onvo, repo, planSupport);
        orden.verify(onvo).cancelarPorNegocio(SUB_ONVO, true);
        orden.verify(planSupport).degradarAPlanBase(sub.getEmpresa());
        orden.verify(repo).save(sub);
        assertThat(sub.getEstado()).isEqualTo("CANCELADO");
        assertThat(sub.getFechaCancelacion()).isNotNull();
        verifyNoInteractions(stripe); // el no-op de Stripe ya no "cancela" una suscripción ONVO
        verify(onvo, never()).cancelarAlVencer(anyString());
        verify(onvo, never()).cancelarInmediato(anyString());
    }

    @Test
    @DisplayName("/trial/tarjeta + inmediata=false: cancelAtPeriodEnd confirmado en ONVO ANTES de marcar al vencer")
    void trialTarjeta_alVencer_onvoAntesQueLocal() throws Exception {
        Suscripcion sub = trialPorTarjeta();
        filaActiva(sub);
        when(onvo.cancelarPorNegocio(SUB_ONVO, false)).thenReturn(ResultadoCancelacion.PROGRAMADA);

        assertThat(billing.cancelar(EMPRESA, false)).isFalse();

        InOrder orden = inOrder(onvo, repo);
        orden.verify(onvo).cancelarPorNegocio(SUB_ONVO, false);
        orden.verify(repo).save(sub);
        assertThat(sub.getCancelarAlVencer()).isTrue();
        assertThat(sub.getEstado()).isEqualTo("TRIAL");
        verifyNoInteractions(stripe, planSupport);
    }

    @Test
    @DisplayName("/cambiar-plan desde trial + inmediata=true: ONVO primero, después CANCELADO local")
    void cambiarPlanDesdeTrial_inmediata_onvoAntesQueLocal() throws Exception {
        Suscripcion sub = trialPorCambiarPlan();
        filaActiva(sub);
        when(onvo.cancelarPorNegocio(SUB_ONVO, true)).thenReturn(ResultadoCancelacion.CANCELADA);

        assertThat(billing.cancelar(EMPRESA, true)).isTrue();

        InOrder orden = inOrder(onvo, repo);
        orden.verify(onvo).cancelarPorNegocio(SUB_ONVO, true);
        orden.verify(repo).save(sub);
        assertThat(sub.getEstado()).isEqualTo("CANCELADO");
        verifyNoInteractions(stripe);
    }

    @Test
    @DisplayName("/cambiar-plan desde trial + inmediata=false: ONVO primero, después cancelarAlVencer local")
    void cambiarPlanDesdeTrial_alVencer_onvoAntesQueLocal() throws Exception {
        Suscripcion sub = trialPorCambiarPlan();
        filaActiva(sub);
        when(onvo.cancelarPorNegocio(SUB_ONVO, false)).thenReturn(ResultadoCancelacion.PROGRAMADA);

        assertThat(billing.cancelar(EMPRESA, false)).isFalse();

        InOrder orden = inOrder(onvo, repo);
        orden.verify(onvo).cancelarPorNegocio(SUB_ONVO, false);
        orden.verify(repo).save(sub);
        assertThat(sub.getCancelarAlVencer()).isTrue();
        verifyNoInteractions(stripe, planSupport);
    }

    @Test
    @DisplayName("inmediata=false pero ONVO responde canceled: se refleja como cancelación inmediata local")
    void alVencer_onvoReportaCanceled_cancelaLocalYa() throws Exception {
        Suscripcion sub = trialPorTarjeta();
        filaActiva(sub);
        when(onvo.cancelarPorNegocio(SUB_ONVO, false)).thenReturn(ResultadoCancelacion.CANCELADA);

        assertThat(billing.cancelar(EMPRESA, false)).isTrue();

        assertThat(sub.getEstado()).isEqualTo("CANCELADO");
        verify(planSupport).degradarAPlanBase(sub.getEmpresa());
    }

    // ── ONVO falla / timeout / ambigua: 503 y estado intacto ────────────────────────────────────────

    @ParameterizedTest(name = "inmediata={0}: ONVO falla → 503 y CERO cambios locales")
    @ValueSource(booleans = {true, false})
    void onvoFalla_503_sinCambios(boolean inmediata) {
        Suscripcion sub = trialPorTarjeta();
        filaActiva(sub);
        when(onvo.cancelarPorNegocio(SUB_ONVO, inmediata))
            .thenThrow(new IllegalStateException("ONVO no confirmó la cancelación"));

        assertThatThrownBy(() -> billing.cancelar(EMPRESA, inmediata))
            .isInstanceOf(CancelacionOnvoNoDisponibleException.class);

        assertIntacta(sub);
        verify(repo, never()).save(any());
        verifyNoInteractions(stripe, planSupport);
        verify(onvo, times(1)).cancelarPorNegocio(SUB_ONVO, inmediata); // sin reintentos desde el servicio
    }

    @ParameterizedTest(name = "inmediata={0}: timeout de ONVO → 503 y CERO cambios locales")
    @ValueSource(booleans = {true, false})
    void onvoTimeout_503_sinCambios(boolean inmediata) {
        Suscripcion sub = trialPorCambiarPlan();
        filaActiva(sub);
        when(onvo.cancelarPorNegocio(SUB_ONVO, inmediata))
            .thenThrow(new ResourceAccessException("Read timed out"));

        assertThatThrownBy(() -> billing.cancelar(EMPRESA, inmediata))
            .isInstanceOf(CancelacionOnvoNoDisponibleException.class);

        assertIntacta(sub);
        assertThat(sub.getPlanPendiente().getNombre()).isEqualTo("NEGOCIO_PLUS");
        verify(repo, never()).save(any());
        verifyNoInteractions(stripe, planSupport);
    }

    @ParameterizedTest(name = "inmediata={0}: respuesta sin resultado (ambigua) → 503 y CERO cambios")
    @ValueSource(booleans = {true, false})
    void onvoAmbigua_503_sinCambios(boolean inmediata) {
        Suscripcion sub = trialPorTarjeta();
        filaActiva(sub);
        when(onvo.cancelarPorNegocio(SUB_ONVO, inmediata)).thenReturn(null);

        assertThatThrownBy(() -> billing.cancelar(EMPRESA, inmediata))
            .isInstanceOf(CancelacionOnvoNoDisponibleException.class);

        assertIntacta(sub);
        verify(repo, never()).save(any());
        verifyNoInteractions(stripe, planSupport);
    }

    @Test
    @DisplayName("Sin cliente ONVO disponible y fila con id ONVO → 503 (nunca cae al no-op de Stripe)")
    void sinClienteOnvo_503() {
        ReflectionTestUtils.setField(billing, "onvoBilling", null);
        Suscripcion sub = trialPorTarjeta();
        filaActiva(sub);

        assertThatThrownBy(() -> billing.cancelar(EMPRESA, true))
            .isInstanceOf(CancelacionOnvoNoDisponibleException.class);
        assertIntacta(sub);
        verifyNoInteractions(stripe, planSupport);
    }

    @Test
    @DisplayName("La fila cambió de suscripción ONVO entre la lectura y el guardado → 503 sin aplicar nada")
    void filaCambioDeIdOnvo_noAplica() {
        Suscripcion leida = trialPorTarjeta();
        Suscripcion otra = trialPorTarjeta();
        otra.setOnvoSubscriptionId("clsubotra0002");
        when(repo.findActivaByEmpresaId(EMPRESA)).thenReturn(Optional.of(leida), Optional.of(leida), Optional.of(otra));
        when(onvo.cancelarPorNegocio(SUB_ONVO, true)).thenReturn(ResultadoCancelacion.CANCELADA);

        assertThatThrownBy(() -> billing.cancelar(EMPRESA, true))
            .isInstanceOf(CancelacionOnvoNoDisponibleException.class);
        assertThat(otra.getEstado()).isEqualTo("TRIAL");
        assertThat(otra.getFechaCancelacion()).isNull();
        verifyNoInteractions(planSupport);
        // Seguimiento (d): ONVO ya canceló → la fila queda marcada para revisión manual (única escritura).
        assertThat(otra.getOnvoRevisionManualDesde()).isNotNull();
        verify(repo, times(1)).save(any());
    }

    @Test
    @DisplayName("Subida ONVO pendiente de pago → 409, sin llamar a ONVO ni tocar nada")
    void subidaPendiente_409() {
        Suscripcion sub = trialPorTarjeta();
        sub.setOnvoSubNuevaPendiente("clsubnueva0003");
        filaActiva(sub);

        assertThatThrownBy(() -> billing.cancelar(EMPRESA, true))
            .isInstanceOf(CancelacionConSubidaPendienteException.class);
        verifyNoInteractions(onvo, stripe, planSupport);
        verify(repo, never()).save(any());
        assertIntacta(sub);
    }

    // ── Sin suscripción ONVO: igual que antes ───────────────────────────────────────────────────────

    @ParameterizedTest(name = "Trial local sin ONVO, inmediata={0}: no se llama a ONVO y se cancela local como antes")
    @ValueSource(booleans = {true, false})
    void sinOnvo_igualQueAntes(boolean inmediata) throws Exception {
        Empresa e = new Empresa();
        e.setEstadoPlan("TRIAL");
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setPlan(plan("PYME"));
        sub.setEstado("TRIAL");
        filaActiva(sub);

        assertThat(billing.cancelar(EMPRESA, inmediata)).isEqualTo(inmediata);

        verifyNoInteractions(onvo, stripe);
        if (inmediata) {
            assertThat(sub.getEstado()).isEqualTo("CANCELADO");
            verify(planSupport).degradarAPlanBase(e);
        } else {
            assertThat(sub.getCancelarAlVencer()).isTrue();
            assertThat(sub.getEstado()).isEqualTo("TRIAL");
            verifyNoInteractions(planSupport);
        }
        verify(repo).save(sub);
    }

    @Test
    @DisplayName("Suscripción Stripe heredada (sin ONVO): se sigue cancelando en Stripe antes que local")
    void stripeHeredada_igualQueAntes() throws Exception {
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(new Empresa());
        sub.setEstado("TRIAL");
        sub.setStripeSubscriptionId("sub_stripe_heredada");
        filaActiva(sub);

        billing.cancelar(EMPRESA, true);

        InOrder orden = inOrder(stripe, repo);
        orden.verify(stripe).cancelarSuscripcion("sub_stripe_heredada", true);
        orden.verify(repo).save(sub);
        verifyNoInteractions(onvo);
    }

    // ── Endpoint /api/billing/cancelar ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /api/billing/cancelar")
    class Endpoint {

        private MockMvc mvc() {
            SuscripcionService svc = new SuscripcionService();
            ReflectionTestUtils.setField(svc, "billingService", billing);
            var guard = mock(com.hotclick.security.PropietarioGuard.class);
            when(guard.puedeGestionarEmpresa(any())).thenReturn(true);
            SuscripcionController c = new SuscripcionController(svc, mock(com.hotclick.repository.PlanRepository.class),
                mock(com.hotclick.service.auth.AuthSupport.class), mock(CobroSuscripcionService.class),
                new PreciosPlanesConfig("9", "24", "49"), guard);
            TenantContext.set(EMPRESA);
            return MockMvcBuilders.standaloneSetup(c).build();
        }

        @ParameterizedTest(name = "inmediata={0}: ONVO caído → 503 CANCELACION_ONVO_NO_DISPONIBLE, estado intacto")
        @ValueSource(booleans = {true, false})
        void onvoCaido_503(boolean inmediata) throws Exception {
            Suscripcion sub = trialPorTarjeta();
            filaActiva(sub);
            when(onvo.cancelarPorNegocio(anyString(), anyBoolean())).thenThrow(new ResourceAccessException("timeout"));

            mvc().perform(post("/api/billing/cancelar").param("inmediata", String.valueOf(inmediata)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.codigo").value("CANCELACION_ONVO_NO_DISPONIBLE"))
                .andExpect(jsonPath("$.error").value(CancelacionOnvoNoDisponibleException.MENSAJE));

            assertIntacta(sub);
            verify(repo, never()).save(any());
            verifyNoInteractions(stripe);
        }

        @Test
        @DisplayName("ONVO confirma → 200 y mensaje según lo que confirmó ONVO")
        void onvoConfirma_200() throws Exception {
            Suscripcion sub = trialPorTarjeta();
            filaActiva(sub);
            when(onvo.cancelarPorNegocio(SUB_ONVO, true)).thenReturn(ResultadoCancelacion.CANCELADA);

            mvc().perform(post("/api/billing/cancelar").param("inmediata", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").value("Suscripción cancelada"));
            assertThat(sub.getEstado()).isEqualTo("CANCELADO");
        }

        @Test
        @DisplayName("Subida pendiente → 409 CANCELACION_CON_SUBIDA_PENDIENTE")
        void subidaPendiente_409() throws Exception {
            Suscripcion sub = trialPorTarjeta();
            sub.setOnvoSubNuevaPendiente("clsubnueva0003");
            filaActiva(sub);

            mvc().perform(post("/api/billing/cancelar").param("inmediata", "false"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("CANCELACION_CON_SUBIDA_PENDIENTE"));
            verifyNoInteractions(onvo);
        }
    }

    @Test
    @DisplayName("Wiring: el cliente Stripe no-op no es el que cancela ONVO (bean ONVO propio en el servicio)")
    void wiring_onvoNoUsaStripe() throws Exception {
        var campo = SuscripcionBillingService.class.getDeclaredField("onvoBilling");
        assertThat(campo.getType()).isEqualTo(OnvoBillingClient.class);
        assertThat(com.hotclick.service.stripe.StripeSubscriptionClient.class
            .isAssignableFrom(OnvoBillingClient.class)).isFalse();
        // El cliente Stripe nunca recibe el id ONVO.
        Suscripcion sub = trialPorTarjeta();
        filaActiva(sub);
        when(onvo.cancelarPorNegocio(SUB_ONVO, true)).thenReturn(ResultadoCancelacion.CANCELADA);
        billing.cancelar(EMPRESA, true);
        verify(stripe, never()).cancelarSuscripcion(eq(SUB_ONVO), anyBoolean());
        verify(stripe, never()).cancelarSuscripcion(isNull(), anyBoolean());
    }
}
