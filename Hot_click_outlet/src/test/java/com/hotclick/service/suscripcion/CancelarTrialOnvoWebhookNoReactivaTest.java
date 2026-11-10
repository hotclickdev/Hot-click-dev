package com.hotclick.service.suscripcion;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.StripeEvento;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.billing.BillingLedgerWriter;
import com.hotclick.service.onvo.OnvoBillingClient;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * MEDIO Seguridad (Opción A): el cobro al final del trial (o la activación del trial con tarjeta) que llega por
 * webhook o reconciliación NO reactiva una suscripción ya cancelada localmente.
 */
@DisplayName("MEDIO Seguridad: webhook de cobro posterior no reactiva una suscripción cancelada")
class CancelarTrialOnvoWebhookNoReactivaTest {

    private static final String SUB = "clsub0001";

    private SuscripcionRepository subs;
    private EmpresaRepository emps;
    private PlanRepository planes;
    private OnvoBillingClient onvo;
    private BillingLedgerWriter ledger;
    private SuscripcionPlanSupport planSupport;
    private SuscripcionOnvoChangeService service;
    private Empresa empresa;
    private Plan emprendedor;

    @BeforeEach
    void setUp() {
        subs = mock(SuscripcionRepository.class);
        emps = mock(EmpresaRepository.class);
        planes = mock(PlanRepository.class);
        onvo = mock(OnvoBillingClient.class);
        ledger = mock(BillingLedgerWriter.class);
        planSupport = mock(SuscripcionPlanSupport.class);
        service = new SuscripcionOnvoChangeService(subs, emps, planes, onvo, mock(OnvoService.class), planSupport, null);
        ReflectionTestUtils.setField(service, "ledgerWriter", ledger);
        ReflectionTestUtils.setField(service, "preciosPlanes", new PreciosPlanesConfig("9", "24", "49", "usd"));
        Plan pyme = new Plan();
        pyme.setNombre("PYME");
        when(planes.findByNombre("PYME")).thenReturn(Optional.of(pyme));
        emprendedor = new Plan();
        emprendedor.setNombre("EMPRENDEDOR");
        empresa = new Empresa();
        empresa.setId(10L);
        empresa.setPlan(emprendedor);
        empresa.setPlanSaas("EMPRENDEDOR");
        empresa.setEstadoPlan("CANCELADO");
    }

    private Suscripcion cancelada() {
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(empresa);
        sub.setPlan(emprendedor);
        sub.setEstado("CANCELADO");
        sub.setFechaCancelacion(LocalDate.of(2026, 11, 10));
        sub.setOnvoSubscriptionId(SUB);
        sub.setOnvoCustomerId("cus_1");
        sub.setCancelarAlVencer(false);
        return sub;
    }

    private void assertSigueCancelada(Suscripcion sub) {
        assertThat(sub.getEstado()).isEqualTo("CANCELADO");
        assertThat(sub.getPlan()).isSameAs(emprendedor);
        assertThat(sub.getFechaFin()).isNull();
        assertThat(sub.getOnvoRevisionManualDesde()).isNotNull();
        assertThat(empresa.getPlanSaas()).isEqualTo("EMPRENDEDOR");
        assertThat(empresa.getEstadoPlan()).isEqualTo("CANCELADO");
        verify(emps, never()).save(any());
        verify(ledger, never()).registrar(any(), any(), anyString(), anyString(), anyString(), any(), any(), any());
    }

    @Test
    @DisplayName("Cobro verificado de la suscripción vigente CANCELADO: se ignora, revisión manual, sin ledger")
    void cobroSobreCancelada_noReactiva() {
        Suscripcion sub = cancelada();
        when(subs.findByOnvoSubscriptionIdForUpdate(SUB)).thenReturn(Optional.of(sub));

        service.procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 10), "clinv0001", LocalDate.of(2026, 11, 10));

        assertSigueCancelada(sub);
    }

    @Test
    @DisplayName("Cobro de una subida pendiente sobre una fila CANCELADO: tampoco reactiva ni cancela la vieja")
    void cobroPendienteSobreCancelada_noReactiva() {
        Suscripcion sub = cancelada();
        sub.setOnvoSubNuevaPendiente("clsubnueva01");
        when(subs.findByOnvoSubscriptionIdForUpdate("clsubnueva01")).thenReturn(Optional.empty());
        when(subs.findByOnvoSubNuevaPendienteForUpdate("clsubnueva01")).thenReturn(Optional.of(sub));

        service.procesarPagoOnvoVerificado("clsubnueva01", "PYME", LocalDate.of(2026, 12, 10), "clinv0002", LocalDate.of(2026, 11, 10));

        assertSigueCancelada(sub);
        assertThat(sub.getOnvoSubscriptionId()).isEqualTo(SUB);
        verify(onvo, never()).cancelarInmediato(anyString());
    }

    @Test
    @DisplayName("Activación de trial con tarjeta sobre una fila CANCELADO: false y sin cambios")
    void trialSobreCancelada_noReactiva() {
        Suscripcion sub = cancelada();
        when(subs.findByOnvoSubscriptionIdForUpdate(SUB)).thenReturn(Optional.of(sub));

        assertThat(service.procesarTrialOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 11, 24))).isFalse();

        assertSigueCancelada(sub);
        assertThat(sub.getTrialEnd()).isNull();
    }

    @Test
    @DisplayName("Trial con tarjeta sobre una fila con cancelación al vencer: activa el trial pero conserva la cancelación")
    void trialConCancelacionAlVencer_laConserva() {
        Suscripcion sub = cancelada();
        sub.setEstado("TRIAL");
        sub.setFechaCancelacion(null);
        sub.setCancelarAlVencer(true);
        when(subs.findByOnvoSubscriptionIdForUpdate(SUB)).thenReturn(Optional.of(sub));

        assertThat(service.procesarTrialOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 11, 24))).isTrue();

        assertThat(sub.getCancelarAlVencer()).isTrue();
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
    }

    @Test
    @DisplayName("Control: un cobro sobre una fila TRIAL (no cancelada) sigue activando como antes")
    void cobroSobreTrial_activaComoAntes() {
        Suscripcion sub = cancelada();
        sub.setEstado("TRIAL");
        sub.setFechaCancelacion(null);
        when(subs.findByOnvoSubscriptionIdForUpdate(SUB)).thenReturn(Optional.of(sub));

        service.procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 10), "clinv0003", LocalDate.of(2026, 11, 10));

        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
        assertThat(sub.getOnvoRevisionManualDesde()).isNull();
        assertThat(empresa.getPlanSaas()).isEqualTo("PYME");
    }

    @Test
    @DisplayName("Webhook completo subscription.renewal.succeeded tras cancelar: 2xx (procesado) y la fila sigue CANCELADO")
    void webhookRenovacion_trasCancelar_noReactiva() throws Exception {
        Suscripcion sub = cancelada();
        when(subs.findByOnvoSubscriptionIdForUpdate(SUB)).thenReturn(Optional.of(sub));
        when(subs.findByOnvoSubscriptionId(SUB)).thenReturn(Optional.of(sub));
        when(subs.existsByOnvoSubscriptionId(SUB)).thenReturn(true);

        SuscripcionService fachada = mock(SuscripcionService.class);
        doAnswer(i -> { service.procesarPagoOnvoVerificado(i.getArgument(0), i.getArgument(1), i.getArgument(2), i.getArgument(3), i.getArgument(4)); return null; })
            .when(fachada).procesarPagoOnvoVerificado(anyString(), anyString(), any(), anyString(), any());

        StripeEventoRepository eventoRepo = mock(StripeEventoRepository.class);
        Map<String, StripeEvento> eventos = new HashMap<>();
        when(eventoRepo.findByIdForUpdate(anyString())).thenAnswer(i -> Optional.ofNullable(eventos.get((String) i.getArgument(0))));
        when(eventoRepo.findById(anyString())).thenAnswer(i -> Optional.ofNullable(eventos.get((String) i.getArgument(0))));
        when(eventoRepo.save(any())).thenAnswer(i -> { StripeEvento e = i.getArgument(0); eventos.put(e.getStripeEventId(), e); return e; });

        OnvoFacturaPeriodoStub.comoLatestInvoice(onvo);
        when(onvo.modoEsperado()).thenReturn("live");
        when(onvo.planParaPriceId("price_pyme")).thenReturn("PYME");
        Map<String, Object> precio = new HashMap<>(Map.of("id", "price_pyme", "mode", "live", "isActive", true,
            "currency", "USD", "unitAmount", 2_400));
        doReturn(precio).when(onvo).obtenerPrecio("price_pyme");
        Map<String, Object> subOnvo = new HashMap<>();
        subOnvo.put("id", SUB);
        subOnvo.put("status", "active");
        subOnvo.put("mode", "live");
        subOnvo.put("customerId", "cus_1");
        subOnvo.put("currentPeriodEnd", "2026-12-10T06:00:00.000Z");
        subOnvo.put("currentPeriodStart", "2026-11-10T06:00:00.000Z");
        subOnvo.put("latestInvoiceId", "clinv0001");
        subOnvo.put("items", List.of(Map.of("id", "item_1", "priceId", "price_pyme")));
        Map<String, Object> factura = new HashMap<>();
        factura.put("id", "clinv0001");
        factura.put("subscriptionId", SUB);
        factura.put("status", "paid");
        factura.put("mode", "live");
        factura.put("currency", "USD");
        factura.put("customerId", "cus_1");
        factura.put("total", 2_400);
        factura.put("periodEnd", "2026-12-10T06:00:00.000Z");
        doReturn(factura).when(onvo).obtenerRenovacion("clinv0001");
        doReturn(subOnvo).when(onvo).obtenerSuscripcion(SUB);

        OnvoBillingWebhookHandler handler = new OnvoBillingWebhookHandler(eventoRepo, fachada, onvo,
            new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24", "49", "usd"), onvo), subs);
        var doc = new ObjectMapper().readTree("""
            {"id":"clinv0001","mode":"live","status":"paid","currency":"USD","total":2400,
             "subscriptionId":"clsub0001","periodEnd":"2026-12-10T06:00:00.000Z"}""");

        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", doc, null)).isTrue();

        verify(fachada).procesarPagoOnvoVerificado(eq(SUB), eq("PYME"), eq(LocalDate.of(2026, 12, 10)), eq("clinv0001"), any());
        assertSigueCancelada(sub);
    }
}
