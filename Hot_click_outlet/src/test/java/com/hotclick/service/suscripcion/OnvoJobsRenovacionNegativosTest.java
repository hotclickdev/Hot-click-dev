package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.CobroSuscripcionRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.billing.BillingLedgerWriter;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** QA área 5 (re-QA): jobs reales (vencimientos PAST_DUE y ACTIVO→PAST_DUE) + OnvoRenovacionReconsulta real, ONVO simulado. */
@DisplayName("Jobs de renovación ONVO | casos negativos QA área 5")
class OnvoJobsRenovacionNegativosTest {
    static final String SUB = "clsub0001", FAC = "clinv0001";
    final LocalDate hoy = LocalDate.now(Constants.ZONA_CR);

    OnvoBillingClient onvo = mock(OnvoBillingClient.class);
    PlanRepository planRepo = mock(PlanRepository.class);
    SuscripcionOnvoChangeService cambio = mock(SuscripcionOnvoChangeService.class);
    SuscripcionRepository subRepo = mock(SuscripcionRepository.class);
    SuscripcionPlanSupport planSupport = mock(SuscripcionPlanSupport.class);
    EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
    OnvoRenovacionReconsulta reconsulta;
    SuscripcionRenewalService job;
    Suscripcion pastDue;

    @BeforeEach
    void setUp() {
        org.springframework.transaction.PlatformTransactionManager tm = mock(org.springframework.transaction.PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus(true));
        reconsulta = new OnvoRenovacionReconsulta(onvo, planRepo, cambio, tm, mock(LockTimeoutPorFila.class),
            new OnvoReconsultaConfig(8, 5, 3, 5000),
            new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24", "49", "usd"), onvo));
        job = new SuscripcionRenewalService();
        ReflectionTestUtils.setField(job, "suscripcionRepo", subRepo);
        ReflectionTestUtils.setField(job, "planSupport", planSupport);
        ReflectionTestUtils.setField(job, "onvoBilling", onvo);
        ReflectionTestUtils.setField(job, "empresaRepo", empresaRepo);
        ReflectionTestUtils.setField(job, "reconsulta", reconsulta);
        ReflectionTestUtils.setField(job, "diasGracia", 8);
        when(onvo.sinLlave()).thenReturn(false);
        when(onvo.isMockMode()).thenReturn(false);
        when(onvo.isBillingDeshabilitado()).thenReturn(false);
        when(onvo.modoEsperado()).thenReturn("live");
        when(onvo.planParaPriceId("price_pyme")).thenReturn("PYME");
        Map<String, Object> precio = new HashMap<>();
        precio.put("id", "price_pyme"); precio.put("mode", "live"); precio.put("isActive", true);
        precio.put("currency", "USD"); precio.put("unitAmount", 2_400L);
        doReturn(precio).when(onvo).obtenerPrecio("price_pyme");
        Plan p = new Plan(); p.setNombre("PYME"); p.setPrecioMensual(12000); 
        when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(p));
        Empresa e = new Empresa(); e.setId(7L);
        pastDue = new Suscripcion();
        ReflectionTestUtils.setField(pastDue, "id", 70L);
        pastDue.setEmpresa(e); pastDue.setPlan(p);
        pastDue.setOnvoSubscriptionId(SUB); pastDue.setOnvoCustomerId("cus_1");
        pastDue.setEstado("PAST_DUE");
        pastDue.setFechaFin(hoy.minusDays(10)); // pasó la gracia (8)
        when(subRepo.findPastDueOnvoVencidos(any(), any())).thenReturn(List.of(pastDue), List.of(), List.of());
        when(subRepo.findPastDueLegadoVencidos(any(), any())).thenReturn(List.of());
        when(subRepo.marcarVencidoSiPastDue(anyLong())).thenReturn(1);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    void onvoDice(String subStatus, String facStatus, LocalDate periodEnd) {
        Map<String, Object> s = new HashMap<>();
        s.put("id", SUB); s.put("status", subStatus); s.put("mode", "live"); s.put("customerId", "cus_1");
        s.put("latestInvoiceId", FAC);
        s.put("items", List.of(Map.of("id", "item_1", "priceId", "price_pyme")));
        Map<String, Object> f = new HashMap<>();
        f.put("id", FAC); f.put("subscriptionId", SUB); f.put("customerId", "cus_1"); f.put("status", facStatus);
        f.put("mode", "live"); f.put("currency", "USD"); f.put("total", 2_400L);
        f.put("periodEnd", periodEnd + "T06:00:00.000Z");
        when(onvo.obtenerSuscripcion(SUB)).thenReturn((Map) s);
        when(onvo.obtenerRenovacion(FAC)).thenReturn((Map) f);
    }

    void noSuspende() {
        verify(subRepo, never()).marcarVencidoSiPastDue(anyLong());
        verify(planSupport, never()).degradarPlanBatchConCache(any(), any());
        verify(empresaRepo, never()).suspenderPorImpagoBatch(any());
    }

    @Test void sinWebhook_onvoActivePaid_jobVencimientosNoSuspendeYReactiva() {
        onvoDice("active", "paid", hoy.plusDays(25));
        assertThat(job.expirarPastDueVencidos()).isZero();
        noSuspende();
        verify(cambio).procesarPagoOnvoVerificado(eq(SUB), eq("PYME"), eq(hoy.plusDays(25)), eq(FAC));
    }

    @Test void onvoCaido_excepcion_noSuspende() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new RuntimeException("ONVO 503"));
        assertThat(job.expirarPastDueVencidos()).isZero();
        noSuspende();
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test void onvoNullSuscripcion_noSuspende() {
        when(onvo.obtenerSuscripcion(SUB)).thenReturn(null);
        assertThat(job.expirarPastDueVencidos()).isZero();
        noSuspende();
    }

    @Test @SuppressWarnings({"unchecked", "rawtypes"}) void onvoNullFactura_noSuspende() {
        onvoDice("active", "paid", hoy.plusDays(25));
        when(onvo.obtenerRenovacion(FAC)).thenReturn(null);
        assertThat(job.expirarPastDueVencidos()).isZero();
        noSuspende();
    }

    @Test void onvoCanceled_sisuspende() {
        onvoDice("canceled", "paid", hoy.plusDays(25));
        assertThat(job.expirarPastDueVencidos()).isEqualTo(1);
        verify(subRepo).marcarVencidoSiPastDue(70L);
        verify(empresaRepo).suspenderPorImpagoBatch(List.of(7L));
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test void onvoActiveFacturaUnpaid_sisuspende() {
        onvoDice("active", "open", hoy.plusDays(25));
        assertThat(job.expirarPastDueVencidos()).isEqualTo(1);
        verify(empresaRepo).suspenderPorImpagoBatch(List.of(7L));
    }

    @Test void onvoUnpaidSub_sisuspende() {
        onvoDice("unpaid", "open", hoy.plusDays(25));
        assertThat(job.expirarPastDueVencidos()).isEqualTo(1);
    }

    @Test void onvoActivePaidPeriodoViejo_sisuspende() {
        onvoDice("active", "paid", hoy.minusDays(3)); // ONVO aun no renovo
        assertThat(job.expirarPastDueVencidos()).isEqualTo(1);
    }

    // ---- job ACTIVO -> PAST_DUE (RenovacionesTilopayService) ----
    RenovacionesTilopayService job2(SuscripcionTilopayService svc) {
        return new RenovacionesTilopayService(subRepo, mock(CobroSuscripcionRepository.class), svc,
            mock(BillingLedgerWriter.class), reconsulta);
    }
    Suscripcion activa() { pastDue.setEstado("ACTIVO"); pastDue.setFechaFin(hoy); return pastDue; }

    @SuppressWarnings("unchecked")
    int pasanAPastDue(SuscripcionTilopayService svc) {
        ArgumentCaptor<List<Suscripcion>> pd = ArgumentCaptor.forClass(List.class);
        verify(svc).guardarRenovaciones(any(), pd.capture());
        return pd.getValue().size();
    }

    @Test void job2_activePaid_noPasaAPastDue() {
        when(subRepo.findVigentesConPlanYEmpresa()).thenReturn(List.of(activa()));
        onvoDice("active", "paid", hoy.plusDays(30));
        SuscripcionTilopayService svc = mock(SuscripcionTilopayService.class);
        job2(svc).generarRenovaciones(hoy);
        assertThat(pasanAPastDue(svc)).isZero();
        assertThat(pastDue.getEstado()).isEqualTo("ACTIVO");
    }

    @Test void job2_onvoCaido_noPasaAPastDue() {
        when(subRepo.findVigentesConPlanYEmpresa()).thenReturn(List.of(activa()));
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new RuntimeException("timeout"));
        SuscripcionTilopayService svc = mock(SuscripcionTilopayService.class);
        job2(svc).generarRenovaciones(hoy);
        assertThat(pasanAPastDue(svc)).isZero();
        assertThat(pastDue.getEstado()).isEqualTo("ACTIVO");
    }

    @Test void job2_onvoNull_noPasaAPastDue() {
        when(subRepo.findVigentesConPlanYEmpresa()).thenReturn(List.of(activa()));
        when(onvo.obtenerSuscripcion(SUB)).thenReturn(null);
        SuscripcionTilopayService svc = mock(SuscripcionTilopayService.class);
        job2(svc).generarRenovaciones(hoy);
        assertThat(pasanAPastDue(svc)).isZero();
    }

    @Test void job2_canceled_sipasaAPastDue() {
        when(subRepo.findVigentesConPlanYEmpresa()).thenReturn(List.of(activa()));
        onvoDice("canceled", "paid", hoy.plusDays(30));
        SuscripcionTilopayService svc = mock(SuscripcionTilopayService.class);
        job2(svc).generarRenovaciones(hoy);
        assertThat(pasanAPastDue(svc)).isEqualTo(1);
        assertThat(pastDue.getEstado()).isEqualTo("PAST_DUE");
    }

    @Test void job2_activeUnpaid_sipasaAPastDue() {
        when(subRepo.findVigentesConPlanYEmpresa()).thenReturn(List.of(activa()));
        onvoDice("active", "open", hoy.plusDays(30));
        SuscripcionTilopayService svc = mock(SuscripcionTilopayService.class);
        job2(svc).generarRenovaciones(hoy);
        assertThat(pasanAPastDue(svc)).isEqualTo(1);
    }
}
