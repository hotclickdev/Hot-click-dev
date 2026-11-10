package com.hotclick.service.suscripcion;

import com.hotclick.model.BillingLedger;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Ítem 10: fecha_inicio del período sale del paid_at del cobro que ONVO confirmó por GET (en Costa Rica), no de la fecha
 * en que se procesa. Fallback: inicio de período de ONVO; sin eso, fecha de procesamiento con advertencia.
 */
@DisplayName("Ítem 10: fecha_inicio desde el paid_at de ONVO")
class SuscripcionFechaInicioOnvoTest {

    private static final String SUB = "clsub0001";
    private static final LocalDate FIN = LocalDate.of(2026, 12, 1);

    private SuscripcionRepository subs;
    private PlanRepository planes;
    private BillingLedgerWriter ledger;
    private SuscripcionOnvoChangeService svc;
    private Suscripcion sub;

    @BeforeEach
    void setUp() {
        subs = mock(SuscripcionRepository.class);
        planes = mock(PlanRepository.class);
        ledger = mock(BillingLedgerWriter.class);
        Plan pyme = new Plan();
        pyme.setNombre("PYME");
        when(planes.findByNombre("PYME")).thenReturn(Optional.of(pyme));
        Empresa e = new Empresa();
        e.setId(10L);
        sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setEstado("PAST_DUE");
        when(subs.findByOnvoSubscriptionIdForUpdate(SUB)).thenReturn(Optional.of(sub));
        svc = new SuscripcionOnvoChangeService(subs, mock(EmpresaRepository.class), planes, mock(OnvoBillingClient.class),
            mock(OnvoService.class), mock(SuscripcionPlanSupport.class), null);
        ReflectionTestUtils.setField(svc, "ledgerWriter", ledger);
        ReflectionTestUtils.setField(svc, "preciosPlanes", new PreciosPlanesConfig("9", "24", "49", "usd"));
    }

    // ------------------------------------------------------------------ objetos ONVO (forma del GET)

    private static Map<String, Object> subOnvo(String currentPeriodStart) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", SUB);
        m.put("status", "active");
        m.put("mode", "live");
        m.put("customerId", "cus_1");
        m.put("currentPeriodEnd", "2026-12-01T06:00:00.000Z");
        if (currentPeriodStart != null) m.put("currentPeriodStart", currentPeriodStart);
        m.put("items", List.of(Map.of("id", "item_1", "priceId", "price_pyme")));
        return m;
    }

    private static Map<String, Object> factura(String id, String paidAt, String periodStart) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("subscriptionId", SUB);
        m.put("status", "paid");
        m.put("mode", "live");
        m.put("currency", "USD");
        m.put("customerId", "cus_1");
        m.put("total", 2_400);
        m.put("periodEnd", "2026-12-01T06:00:00.000Z");
        if (periodStart != null) m.put("periodStart", periodStart);
        Map<String, Object> pi = new HashMap<>();
        pi.put("status", "succeeded");
        pi.put("receivedAmount", 2_400);
        if (paidAt != null) pi.put("paidAt", paidAt);
        m.put("paymentIntent", pi);
        return m;
    }

    private static OnvoBillingVerificador.Resultado renovacion(Map<String, Object> factura, Map<String, Object> sub) {
        return OnvoBillingVerificador.renovacion(factura, sub, String.valueOf(factura.get("id")), SUB, "live",
            p -> "PYME", (plan, price) -> new OnvoBillingVerificador.PrecioEsperado("USD", 2_400));
    }

    private void procesar(OnvoBillingVerificador.Resultado r, String ref) {
        assertThat(r.aceptado()).as(r.motivo()).isTrue();
        svc.procesarPagoOnvoVerificado(SUB, r.planNombre(), r.fechaFin(), ref, r.fechaInicio());
    }

    // ------------------------------------------------------------------ tests

    @Test
    @DisplayName("paid_at 23:50 CR procesado después de medianoche: el inicio es el día del pago, no el de procesamiento")
    void paidAtAntesDeMedianocheCr() {
        // 2026-11-02T05:50Z = 1-nov 23:50 en Costa Rica (UTC-6). El currentPeriodStart (2-nov CR) no gana.
        OnvoBillingVerificador.Resultado r = renovacion(
            factura("clinv0001", "2026-11-02T05:50:00.000Z", null), subOnvo("2026-11-02T06:30:00.000Z"));
        assertThat(r.fechaInicio()).isEqualTo(LocalDate.of(2026, 11, 1));
        procesar(r, "clinv0001");
        assertThat(sub.getFechaInicio()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(sub.getFechaFin()).isEqualTo(FIN);
        assertThat(sub.getFechaInicio()).isBefore(sub.getFechaFin());
    }

    @Test
    @DisplayName("Webhook que llega un día tarde: el inicio sigue siendo el paid_at, no la fecha en que llegó")
    void webhookUnDiaTarde() {
        OnvoBillingVerificador.Resultado r = renovacion(
            factura("clinv0001", "2026-11-01T16:00:00.000Z", "2026-11-01T06:00:00.000Z"), subOnvo("2026-11-01T06:00:00.000Z"));
        procesar(r, "clinv0001");
        assertThat(sub.getFechaInicio()).isEqualTo(LocalDate.of(2026, 11, 1))
            .isNotEqualTo(LocalDate.now(Constants.ZONA_CR));
        assertThat(sub.getEmpresa().getFechaVencPlan()).isEqualTo(FIN);
    }

    @Test
    @DisplayName("Renovación: el inicio del período nuevo sale de su paid_at; el mismo período no se reescribe")
    void renovacionNoReescribeElMismoPeriodo() {
        sub.setEstado("ACTIVO");
        sub.setFechaInicio(LocalDate.of(2026, 10, 1));
        sub.setFechaFin(LocalDate.of(2026, 11, 1));
        procesar(renovacion(factura("clinv0002", "2026-11-01T12:00:00.000Z", "2026-11-01T06:00:00.000Z"),
            subOnvo("2026-11-01T06:00:00.000Z")), "clinv0002");
        assertThat(sub.getFechaInicio()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(sub.getFechaFin()).isEqualTo(FIN);

        // Mismo período (mismo fin) aplicado de nuevo por otra referencia (p. ej. la reconciliación por intent):
        // el inicio ya guardado no cambia aunque llegue otra fecha.
        svc.procesarPagoOnvoVerificado(SUB, "PYME", FIN, "pi_alta_otro", LocalDate.of(2026, 11, 3));
        assertThat(sub.getFechaInicio()).isEqualTo(LocalDate.of(2026, 11, 1));
    }

    @Test
    @DisplayName("paid_at ausente o ilegible: usa el inicio de período de ONVO; sin nada, la fecha de procesamiento")
    void paidAtAusente() {
        OnvoBillingVerificador.Resultado conPeriodo = renovacion(
            factura("clinv0001", "ayer a las 5", "2026-11-01T06:00:00.000Z"), subOnvo("2026-10-15T06:00:00.000Z"));
        assertThat(conPeriodo.fechaInicio()).isEqualTo(LocalDate.of(2026, 11, 1));
        OnvoBillingVerificador.Resultado soloSub = renovacion(
            factura("clinv0001", null, null), subOnvo("2026-11-01T06:00:00.000Z"));
        assertThat(soloSub.fechaInicio()).isEqualTo(LocalDate.of(2026, 11, 1));
        OnvoBillingVerificador.Resultado sinNada = renovacion(factura("clinv0001", null, null), subOnvo(null));
        assertThat(sinNada.aceptado()).isTrue();
        assertThat(sinNada.fechaInicio()).isNull();

        procesar(sinNada, "clinv0001");
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        LocalDate esperado = hoy.isBefore(FIN) ? hoy : FIN.minusMonths(1);
        assertThat(sub.getFechaInicio()).isEqualTo(esperado).isBefore(sub.getFechaFin());
    }

    @Test
    @DisplayName("Doble procesamiento del mismo cobro: el segundo no cambia la fecha (ledger COBRO_OK)")
    void dobleProcesamientoNoCambiaLaFecha() {
        when(ledger.yaRegistrado(eq("clinv0001"), eq(BillingLedger.TIPO_COBRO_OK))).thenReturn(false, true);
        OnvoBillingVerificador.Resultado r = renovacion(
            factura("clinv0001", "2026-11-02T05:50:00.000Z", null), subOnvo(null));
        procesar(r, "clinv0001");
        assertThat(sub.getFechaInicio()).isEqualTo(LocalDate.of(2026, 11, 1));

        svc.procesarPagoOnvoVerificado(SUB, "PYME", FIN, "clinv0001", LocalDate.of(2026, 11, 9));
        assertThat(sub.getFechaInicio()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(sub.getFechaFin()).isEqualTo(FIN);
        verify(subs, times(1)).save(sub);
        verify(subs, times(2)).findByOnvoSubscriptionIdForUpdate(SUB);
    }

    @Test
    @DisplayName("Alta por intent: paid_at del intent (o de su cargo succeeded) en Costa Rica")
    void altaPorIntentUsaPaidAtDelIntent() {
        Map<String, Object> intent = new HashMap<>();
        intent.put("id", "pi_1");
        intent.put("status", "succeeded");
        intent.put("mode", "live");
        intent.put("currency", "USD");
        intent.put("amount", 2_400);
        intent.put("charges", List.of(
            Map.of("status", "failed", "paidAt", "2026-10-30T12:00:00.000Z"),
            Map.of("status", "succeeded", "paid_at", "2026-11-02T05:59:00.000Z")));
        Map<String, Object> fac = factura("clinv_alta", null, null);
        fac.put("paymentIntentId", "pi_1");
        OnvoBillingVerificador.Resultado r = OnvoBillingVerificador.altaPorIntent(
            new OnvoBillingVerificador.AltaObjetos(intent, fac, subOnvo("2026-11-02T06:00:00.000Z")), "pi_1", SUB, "live",
            p -> "PYME", (plan, price) -> new OnvoBillingVerificador.PrecioEsperado("USD", 2_400));
        assertThat(r.aceptado()).as(r.motivo()).isTrue();
        assertThat(r.fechaInicio()).isEqualTo(LocalDate.of(2026, 11, 1));
    }

    @Test
    @DisplayName("Coherencia: un inicio que no es anterior al fin se ajusta a un mes antes del fin")
    void inicioCoherenteConElFin() {
        svc.procesarPagoOnvoVerificado(SUB, "PYME", FIN, "clinv0001", LocalDate.of(2026, 12, 3));
        assertThat(sub.getFechaInicio()).isEqualTo(LocalDate.of(2026, 11, 1));
        verify(ledger).registrar(any(), eq(sub), eq("COBRO_OK"), eq("ONVO"), eq("clinv0001"), any(), any(), any());
    }
}
