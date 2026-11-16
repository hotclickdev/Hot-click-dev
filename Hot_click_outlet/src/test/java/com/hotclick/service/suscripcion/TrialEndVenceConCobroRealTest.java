package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FacturaSaasRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.billing.BillingLedgerWriter;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Riesgo 15-nov: un plan ya cobrado seguía viéndose como trial porque trial_end seguía vigente. Un COBRO_OK real
 * (monto &gt; 0) vence trial_end (no lo anula: queda como historial para no permitir un segundo trial); un cargo de
 * trial de 0 no lo toca.
 */
@DisplayName("Un cobro real vence trial_end; el de 0 no")
class TrialEndVenceConCobroRealTest {

    private static final String SUB = "clsub0001";
    private static final LocalDate HOY = LocalDate.now(Constants.ZONA_CR);

    private final SuscripcionRepository subs = mock(SuscripcionRepository.class);
    private final Suscripcion sub = new Suscripcion();

    private SuscripcionOnvoChangeService onvo() {
        PlanRepository planes = mock(PlanRepository.class);
        Plan pyme = new Plan();
        pyme.setNombre("PYME");
        when(planes.findByNombre("PYME")).thenReturn(Optional.of(pyme));
        SuscripcionOnvoChangeService svc = new SuscripcionOnvoChangeService(subs, mock(EmpresaRepository.class), planes,
            mock(OnvoBillingClient.class), mock(OnvoService.class), mock(SuscripcionPlanSupport.class), null);
        ReflectionTestUtils.setField(svc, "ledgerWriter", mock(BillingLedgerWriter.class));
        ReflectionTestUtils.setField(svc, "preciosPlanes", new PreciosPlanesConfig("9", "24", "49", "usd"));
        return svc;
    }

    private SuscripcionWebhookService stripe() {
        SuscripcionWebhookService svc = new SuscripcionWebhookService();
        ReflectionTestUtils.setField(svc, "suscripcionRepo", subs);
        ReflectionTestUtils.setField(svc, "facturaRepo", mock(FacturaSaasRepository.class));
        ReflectionTestUtils.setField(svc, "eventoRepo", mock(StripeEventoRepository.class));
        ReflectionTestUtils.setField(svc, "empresaRepo", mock(EmpresaRepository.class));
        ReflectionTestUtils.setField(svc, "planSupport", mock(SuscripcionPlanSupport.class));
        ReflectionTestUtils.setField(svc, "ledgerWriter", mock(BillingLedgerWriter.class));
        return svc;
    }

    @BeforeEach
    void setUp() {
        Empresa e = new Empresa();
        e.setId(10L);
        sub.setEmpresa(e);
        sub.setEstado("TRIAL");
        sub.setTrialEnd(HOY.plusDays(5));
        when(subs.findByOnvoSubscriptionIdForUpdate(SUB)).thenReturn(Optional.of(sub));
        when(subs.findByStripeSubscriptionId("sub_s")).thenReturn(Optional.of(sub));
    }

    @Test
    @DisplayName("ONVO: COBRO_OK verificado (monto completo > 0) deja trial_end vencido, no nulo")
    void onvoCobroRealVenceTrialEnd() {
        onvo().procesarPagoOnvoVerificado(SUB, "PYME", HOY.plusMonths(1), "clinv0001", HOY);
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
        assertThat(sub.getTrialEnd()).isNotNull().isBefore(HOY);
    }

    @Test
    @DisplayName("ONVO: trial_end ya pasado no se toca (conserva la fecha original)")
    void onvoTrialEndPasadoSeConserva() {
        LocalDate pasado = HOY.minusDays(20);
        sub.setTrialEnd(pasado);
        onvo().procesarPagoOnvoVerificado(SUB, "PYME", HOY.plusMonths(1), "clinv0002", HOY);
        assertThat(sub.getTrialEnd()).isEqualTo(pasado);
    }

    @Test
    @DisplayName("ONVO: sin trial_end (nunca tuvo trial) sigue nulo")
    void onvoSinTrialSigueNulo() {
        sub.setTrialEnd(null);
        onvo().procesarPagoOnvoVerificado(SUB, "PYME", HOY.plusMonths(1), "clinv0003", HOY);
        assertThat(sub.getTrialEnd()).isNull();
    }

    @Test
    @DisplayName("Stripe legado: factura pagada con monto > 0 vence trial_end")
    void stripeCobroRealVenceTrialEnd() {
        stripe().procesarFacturaPagada("sub_s", "in_1", "pi_1", 10L, 2_400, "usd", HOY, HOY.plusMonths(1), null);
        assertThat(sub.getTrialEnd()).isNotNull().isBefore(HOY);
    }

    @Test
    @DisplayName("Stripe legado: factura de 0 (trial) NO vence trial_end")
    void stripeCargoDeTrialDeCeroNoVence() {
        LocalDate antes = sub.getTrialEnd();
        stripe().procesarFacturaPagada("sub_s", "in_0", "pi_0", 10L, 0, "usd", HOY, HOY.plusDays(14), null);
        assertThat(sub.getTrialEnd()).isEqualTo(antes);
    }
}
