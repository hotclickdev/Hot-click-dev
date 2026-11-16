package com.hotclick.service.suscripcion;

import com.hotclick.controller.SuscripcionController;
import com.hotclick.exception.CambioPlanRequiereSolicitudException;
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
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.Optional;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Riesgos 15-nov (PR 562 + PR 569): un trial ONVO con tarjeta se cancela por el camino normal, pero en cuanto entra un
 * COBRO_OK real (trial_end vencido) el plan ya es de pago: cancelar responde 422 y no toca ONVO ni la fila local.
 */
@DisplayName("Cancelar el trial después de un COBRO_OK real: 422 y sin llamar a ONVO")
class CancelarTrialTrasCobroRealTest {

    private static final Long EMPRESA = 7L;
    private static final String SUB_ONVO = "clsubtrial0001";
    private static final LocalDate HOY = LocalDate.now(Constants.ZONA_CR);

    private SuscripcionRepository repo;
    private OnvoBillingClient onvo;
    private StripeService stripe;
    private SuscripcionPlanSupport planSupport;
    private SuscripcionBillingService billing;
    private Suscripcion sub;

    @BeforeEach
    void setUp() {
        repo = mock(SuscripcionRepository.class);
        onvo = mock(OnvoBillingClient.class);
        stripe = mock(StripeService.class);
        planSupport = mock(SuscripcionPlanSupport.class);
        billing = new SuscripcionBillingService();
        ReflectionTestUtils.setField(billing, "suscripcionRepo", repo);
        ReflectionTestUtils.setField(billing, "stripeService", stripe);
        ReflectionTestUtils.setField(billing, "planSupport", planSupport);
        ReflectionTestUtils.setField(billing, "onvoBilling", onvo);
        ReflectionTestUtils.setField(billing, "self", billing);

        Empresa e = new Empresa();
        e.setId(EMPRESA);
        e.setEstadoPlan("TRIAL");
        e.setPlanSaas("EMPRENDEDOR");
        e.setEstadoEmpresa("ACTIVO");
        Plan emprendedor = new Plan();
        emprendedor.setNombre("EMPRENDEDOR");
        sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setPlan(emprendedor);
        sub.setEstado("TRIAL");
        sub.setTrialEnd(HOY.plusDays(10));
        sub.setOnvoCustomerId("clcus0001");
        sub.setOnvoSubscriptionId(SUB_ONVO);
        sub.setCancelarAlVencer(false);
        when(repo.findActivaByEmpresaId(EMPRESA)).thenReturn(Optional.of(sub));
        when(repo.idsActivasByEmpresaId(EMPRESA)).thenReturn(List.of(99L));
        when(repo.findByIdForUpdate(99L)).thenReturn(Optional.of(sub));
        when(repo.findByOnvoSubscriptionIdForUpdate(SUB_ONVO)).thenReturn(Optional.of(sub));
    }

    @AfterEach
    void limpiar() { TenantContext.clear(); }

    /** Cobro real por el mismo camino que el webhook/reconciliación (monto > 0): activa y vence trial_end. */
    private void entraCobroOkReal() {
        PlanRepository planes = mock(PlanRepository.class);
        when(planes.findByNombre("EMPRENDEDOR")).thenReturn(Optional.of(sub.getPlan()));
        OnvoBillingClient onvoCambio = mock(OnvoBillingClient.class);
        SuscripcionOnvoChangeService cambio = new SuscripcionOnvoChangeService(repo, mock(EmpresaRepository.class),
            planes, onvoCambio, mock(OnvoService.class), mock(SuscripcionPlanSupport.class), null);
        ReflectionTestUtils.setField(cambio, "ledgerWriter", mock(BillingLedgerWriter.class));
        ReflectionTestUtils.setField(cambio, "preciosPlanes", new PreciosPlanesConfig("9", "24", "49", "usd"));
        cambio.procesarPagoOnvoVerificado(SUB_ONVO, "EMPRENDEDOR", HOY.plusMonths(1), "clinv0001", HOY);
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
        assertThat(sub.getTrialEnd()).isBefore(HOY);
    }

    @Test
    @DisplayName("Antes del cobro: el trial con tarjeta sí se cancela (cancelarPorNegocio en ONVO)")
    void antesDelCobroSeCancela() throws Exception {
        when(onvo.cancelarPorNegocio(SUB_ONVO, true)).thenReturn(OnvoBillingClient.ResultadoCancelacion.CANCELADA);
        assertThat(billing.cancelar(EMPRESA, true)).isTrue();
        verify(onvo).cancelarPorNegocio(SUB_ONVO, true);
    }

    @Test
    @DisplayName("Servicio: tras COBRO_OK real cancelar lanza CambioPlanRequiereSolicitud, sin ONVO ni cambios locales")
    void servicio_422_sinOnvo() throws Exception {
        entraCobroOkReal();
        org.mockito.Mockito.clearInvocations(repo);

        for (boolean inmediata : new boolean[] {true, false}) {
            assertThatThrownBy(() -> billing.cancelar(EMPRESA, inmediata))
                .isInstanceOf(CambioPlanRequiereSolicitudException.class);
        }
        verifyNoInteractions(onvo, stripe, planSupport);
        verify(repo, never()).save(any());
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
        assertThat(sub.getCancelarAlVencer()).isFalse();
        assertThat(sub.getFechaCancelacion()).isNull();
    }

    @Test
    @DisplayName("POST /api/billing/cancelar tras COBRO_OK real: 422 CAMBIO_PLAN_REQUIERE_SOLICITUD y ONVO sin llamadas")
    void endpoint_422_sinOnvo() throws Exception {
        entraCobroOkReal();
        SuscripcionService svc = new SuscripcionService();
        ReflectionTestUtils.setField(svc, "billingService", billing);
        var guard = mock(com.hotclick.security.PropietarioGuard.class);
        when(guard.puedeGestionarEmpresa(any())).thenReturn(true);
        SuscripcionController c = new SuscripcionController(svc, mock(PlanRepository.class),
            mock(com.hotclick.service.auth.AuthSupport.class), mock(CobroSuscripcionService.class),
            new PreciosPlanesConfig("9", "24", "49"), guard);
        TenantContext.set(EMPRESA);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(c).build();

        mvc.perform(post("/api/billing/cancelar").param("inmediata", "true"))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.codigo").value(CambioPlanRequiereSolicitudException.CODIGO));

        verifyNoInteractions(onvo, stripe);
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
    }
}
