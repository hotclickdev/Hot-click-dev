package com.hotclick.service.suscripcion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Plan;
import com.hotclick.model.StripeEvento;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Webhook billing ONVO (S-02, S-04, S-06)")
class OnvoBillingWebhookHandlerTest {

    @Mock StripeEventoRepository eventoRepo;
    @Mock SuscripcionService suscripcionService;
    @Mock OnvoBillingClient onvo;
    @Mock PlanRepository planRepo;
    @Mock SuscripcionRepository suscripcionRepo;
    OnvoBillingWebhookHandler handler;

    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, StripeEvento> eventos = new HashMap<>();

    @BeforeEach
    void setUp() {
        handler = new OnvoBillingWebhookHandler(eventoRepo, suscripcionService, onvo, planRepo, suscripcionRepo);
        when(eventoRepo.findByIdForUpdate(anyString())).thenAnswer(i -> Optional.ofNullable(eventos.get((String) i.getArgument(0))));
        when(eventoRepo.findById(anyString())).thenAnswer(i -> Optional.ofNullable(eventos.get((String) i.getArgument(0))));
        when(eventoRepo.save(any())).thenAnswer(i -> {
            StripeEvento e = i.getArgument(0);
            eventos.put(e.getStripeEventId(), e);
            return e;
        });
        when(onvo.modoEsperado()).thenReturn("live");
        when(onvo.planParaPriceId("price_pyme")).thenReturn("PYME");
        when(onvo.planParaPriceId("price_plus")).thenReturn("NEGOCIO_PLUS");
        when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(plan("PYME", 12000)));
        when(planRepo.findByNombre("NEGOCIO_PLUS")).thenReturn(Optional.of(plan("NEGOCIO_PLUS", 25000)));
    }

    private static Plan plan(String n, int precio) {
        Plan p = new Plan();
        p.setNombre(n);
        p.setPrecioMensual(precio);
        return p;
    }

    private static Map<String, Object> subOnvo(String id, String status, String mode, String priceId) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("status", status);
        if (mode != null) m.put("mode", mode);
        m.put("customerId", "cus_1");
        m.put("currentPeriodEnd", "2026-12-01T06:00:00.000Z");
        m.put("items", List.of(Map.of("id", "item_1", "priceId", priceId)));
        return m;
    }

    private static Map<String, Object> invoice(String id, String sub, String status, String mode, long total) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("subscriptionId", sub);
        m.put("status", status);
        if (mode != null) m.put("mode", mode);
        m.put("currency", "CRC");
        m.put("customerId", "cus_1");
        m.put("total", total);
        m.put("periodEnd", "2026-12-01T06:00:00.000Z");
        return m;
    }

    private JsonNode json(String s) throws Exception { return mapper.readTree(s); }

    private static final String RENOVACION_DOC = """
        {"id":"clinv0001","mode":"live","status":"paid","currency":"CRC","total":1200000,
         "subscriptionId":"clsub0001","periodEnd":"2026-12-01T06:00:00.000Z"}""";

    @Test
    @DisplayName("Renovación verificada por GET activa el plan del priceId de ONVO con el fin de período de ONVO")
    void renovacionVerificadaActiva() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "live", 1_200_000));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));

        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null)).isTrue();
        verify(suscripcionService).procesarPagoOnvoVerificado("clsub0001", "PYME", LocalDate.of(2026, 12, 1));
    }

    @Test
    @DisplayName("S-02 repro: cuerpo con mode test y total 1 ya no activa; ONVO por GET dice test → rechazo")
    void cuerpoFalsoModoTestNoActiva() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "test", 1_200_000));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "test", "price_pyme"));
        var body = json("""
            {"id":"clinv0001","mode":"test","subscriptionId":"clsub0001","total":1}""");
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", body, null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getProcesadoOk()).isFalse();
    }

    @Test
    @DisplayName("S-02: sin mode en la respuesta de ONVO se rechaza (fail-closed)")
    void sinModoRechaza() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", null, 1_200_000));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("S-02: renovación no pagada, monto 0 o mayor al plan → rechazo")
    void noPagadaOMontoDistinto() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "open", "live", 1_200_000));
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        for (long total : new long[]{0, 1_200_001}) {
            when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "live", total));
            assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null))
                .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        }
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("ONVO: primera factura prorrateada (0 < total <= precio) se acepta con el plan del priceId")
    void facturaProrrateadaAceptada() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_plus"));
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "live", 830_000));
        handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null);
        verify(suscripcionService).procesarPagoOnvoVerificado("clsub0001", "NEGOCIO_PLUS", LocalDate.of(2026, 12, 1));
    }

    @Test
    @DisplayName("S-02: renovación de otro customer o sin subscriptionId en la factura → rechazo")
    void renovacionDeOtroCustomer() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        Map<String, Object> inv = invoice("clinv0001", "clsub0001", "paid", "live", 1_200_000);
        inv.put("customerId", "cus_otro");
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) inv);
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        Map<String, Object> inv2 = invoice("clinv0001", null, "paid", "live", 1_200_000);
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) inv2);
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("S-02: renovación sin id → rechazo, sin registrar evento")
    void sinIdRechaza() throws Exception {
        var body = json("{\"subscriptionId\":\"clsub0001\",\"mode\":\"live\"}");
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", body, null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        verify(onvo, never()).obtenerRenovacion(any());
    }

    private static final Map<String, Object> INTENT_OK = Map.of("id", "pi_1", "mode", "live",
        "status", "succeeded", "currency", "CRC", "amount", 1_200_000, "customerId", "cus_1");

    private static Suscripcion local(String subId) {
        Suscripcion l = new Suscripcion();
        l.setOnvoSubscriptionId(subId);
        return l;
    }

    @Test
    @DisplayName("Empresa: metadata.empresa_id se ignora; sin suscripción local para el subscriptionId → rechazo")
    void intentConMetadataAjenaNoActiva() throws Exception {
        when(onvo.obtenerPaymentIntent("pi_1")).thenReturn((Map) INTENT_OK);
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("clsub_x")).thenReturn(Optional.empty());
        var body = json("{\"id\":\"pi_1\",\"subscriptionId\":\"clsub_x\",\"metadata\":{\"empresa_id\":\"10\",\"plan_id\":\"3\"}}");
        assertThatThrownBy(() -> handler.manejarSiBilling("payment-intent.succeeded", body, null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        verify(suscripcionRepo, never()).findActivaByEmpresaId(any());
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("Empresa: alta por intent se resuelve por subscriptionId con lock, plan del priceId de ONVO")
    void altaPorIntentVerificada() throws Exception {
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("clsub0001")).thenReturn(Optional.of(local("clsub0001")));
        when(onvo.obtenerPaymentIntent("pi_1")).thenReturn((Map) INTENT_OK);
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        var body = json("{\"id\":\"pi_1\",\"subscriptionId\":\"clsub0001\",\"metadata\":{\"plan_id\":\"999\"}}");
        assertThat(handler.manejarSiBilling("payment-intent.succeeded", body, null)).isTrue();
        verify(suscripcionService).procesarPagoOnvoVerificado("clsub0001", "PYME", LocalDate.of(2026, 12, 1));
    }

    @Test
    @DisplayName("Empresa: sin subscriptionId, respaldo por customerId (una sola suscripción local)")
    void altaPorCustomerRespaldo() throws Exception {
        when(suscripcionRepo.findByOnvoCustomerIdForUpdate("cus_1")).thenReturn(List.of(local("clsub0001")));
        when(onvo.obtenerPaymentIntent("pi_1")).thenReturn((Map) INTENT_OK);
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        assertThat(handler.manejarSiBilling("payment-intent.succeeded", json("{\"id\":\"pi_1\",\"customerId\":\"cus_1\"}"), null)).isTrue();
        verify(suscripcionService).procesarPagoOnvoVerificado("clsub0001", "PYME", LocalDate.of(2026, 12, 1));
    }

    @Test
    @DisplayName("Empresa: customerId con varias suscripciones locales es ambiguo → rechazo")
    void customerAmbiguoRechaza() throws Exception {
        when(suscripcionRepo.findByOnvoCustomerIdForUpdate("cus_1")).thenReturn(List.of(local("a"), local("b")));
        when(onvo.obtenerPaymentIntent("pi_1")).thenReturn((Map) INTENT_OK);
        assertThatThrownBy(() -> handler.manejarSiBilling("payment-intent.succeeded", json("{\"id\":\"pi_1\",\"customerId\":\"cus_1\"}"), null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("Evento duplicado no vuelve a activar")
    void eventoDuplicadoNoReprocesa() throws Exception {
        StripeEvento yaOk = new StripeEvento();
        yaOk.setStripeEventId("onvo_subscription.renewal.succeeded_clinv0001");
        yaOk.setProcesadoOk(true);
        eventos.put(yaOk.getStripeEventId(), yaOk);
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null)).isTrue();
        verify(onvo, never()).obtenerRenovacion(any());
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("payment-intent de tienda sin meta billing se ignora")
    void paymentIntentSinMetaNoEsBilling() throws Exception {
        assertThat(handler.manejarSiBilling("payment-intent.succeeded", json("{\"id\":\"pi_tienda\"}"), null)).isFalse();
    }

    private static String fallo(String periodo, int intento, String pi) {
        return """
            {"subscriptionId":"clsub0002","paymentIntentId":"%s","currency":"CRC","attemptCount":%d,
             "invoiceStatus":"open","subscriptionStatus":"past_due","invoicePeriodStart":"%s"}"""
            .formatted(pi, intento, periodo);
    }

    @Test
    @DisplayName("S-04 repro: renewal.failed de dos períodos distintos se procesan los dos")
    void fallasDeDosPeriodosSeProcesan() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) subOnvo("clsub0002", "past_due", "live", "price_pyme"));
        handler.manejarSiBilling("subscription.renewal.failed", json(fallo("2026-04-01T00:00:00.000Z", 1, "pi_a")), null);
        handler.manejarSiBilling("subscription.renewal.failed", json(fallo("2026-05-01T00:00:00.000Z", 1, "pi_b")), null);
        // mismo período con otro intento/intent: misma clave (subscriptionId + invoicePeriodStart), se descarta
        handler.manejarSiBilling("subscription.renewal.failed", json(fallo("2026-04-01T00:00:00.000Z", 2, "pi_c")), null);
        verify(suscripcionService, times(2)).procesarRenovacionOnvoFallida("clsub0002");
        assertThat(eventos).containsKey("onvo_subscription.renewal.failed_clsub0002_2026-04-01T00:00:00.000Z");
    }

    @Test
    @DisplayName("S-04: renewal.failed sin invoicePeriodStart → rechazo (no hay clave segura)")
    void falloSinPeriodoRechaza() throws Exception {
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.failed",
                json("{\"subscriptionId\":\"clsub0002\"}"), null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        verify(onvo, never()).obtenerSuscripcion(any());
    }

    @Test
    @DisplayName("renewal.failed con ONVO reportando active no marca PAST_DUE")
    void falloNoConfirmadoNoMarca() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) subOnvo("clsub0002", "active", "live", "price_pyme"));
        handler.manejarSiBilling("subscription.renewal.failed", json(fallo("2026-04-01T00:00:00.000Z", 1, "pi_a")), null);
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
    }

    @Test
    @DisplayName("S-03: ONVO no manda evento de cancelación; un subscription.canceled no baja nada")
    void eventoCanceladoIgnorado() throws Exception {
        handler.manejarSiBilling("subscription.canceled", json("{\"id\":\"ev_1\",\"subscriptionId\":\"clsub0003\"}"), null);
        verify(onvo, never()).obtenerSuscripcion(any());
        verify(suscripcionService, never()).procesarSuscripcionOnvoEliminada(any());
    }

    @Test
    @DisplayName("S-03: renewal.failed con GET status=canceled cierra la suscripción local")
    void canceladaPorGet() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) subOnvo("clsub0002", "canceled", "live", "price_pyme"));
        handler.manejarSiBilling("subscription.renewal.failed", json(fallo("2026-04-01T00:00:00.000Z", 3, "pi_a")), null);
        verify(suscripcionService).procesarSuscripcionOnvoEliminada("clsub0002");
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
    }
}
