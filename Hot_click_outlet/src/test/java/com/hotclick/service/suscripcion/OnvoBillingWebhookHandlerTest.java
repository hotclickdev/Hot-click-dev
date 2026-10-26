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
    @DisplayName("S-02: renovación no pagada o monto distinto al plan → rechazo")
    void noPagadaOMontoDistinto() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "open", "live", 1_200_000));
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "live", 100));
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("S-06 repro: priceId ya es Plus pero ONVO cobró precio PYME → no activa Plus")
    void cambioAPlusConMontoPymeNoActiva() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_plus"));
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "live", 1_200_000));
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

    @Test
    @DisplayName("S-02 repro: payment-intent con metadata de otra empresa sin suscripción ONVO no activa nada")
    void intentConMetadataAjenaNoActiva() throws Exception {
        when(suscripcionRepo.findActivaByEmpresaId(99L)).thenReturn(Optional.empty());
        var body = json("{\"id\":\"pi_1\",\"metadata\":{\"empresa_id\":\"99\",\"plan_id\":\"3\"}}");
        assertThatThrownBy(() -> handler.manejarSiBilling("payment-intent.succeeded", body, null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("Alta por payment-intent verificado (mismo customer, monto del plan) activa el plan de ONVO, no el de metadata")
    void altaPorIntentVerificada() throws Exception {
        Suscripcion local = new Suscripcion();
        local.setOnvoSubscriptionId("clsub0001");
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(local));
        when(onvo.obtenerPaymentIntent("pi_1")).thenReturn((Map) Map.of("id", "pi_1", "mode", "live",
            "status", "succeeded", "currency", "CRC", "amount", 1_200_000, "customerId", "cus_1"));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        var body = json("{\"id\":\"pi_1\",\"metadata\":{\"empresa_id\":\"10\",\"plan_id\":\"999\"}}");
        assertThat(handler.manejarSiBilling("payment-intent.succeeded", body, null)).isTrue();
        verify(suscripcionService).procesarPagoOnvoVerificado("clsub0001", "PYME", LocalDate.of(2026, 12, 1));
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
        // reintento idéntico del primero: sí se descarta
        handler.manejarSiBilling("subscription.renewal.failed", json(fallo("2026-04-01T00:00:00.000Z", 1, "pi_a")), null);
        verify(suscripcionService, times(2)).procesarRenovacionOnvoFallida("clsub0002");
    }

    @Test
    @DisplayName("renewal.failed con ONVO reportando active no marca PAST_DUE")
    void falloNoConfirmadoNoMarca() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) subOnvo("clsub0002", "active", "live", "price_pyme"));
        handler.manejarSiBilling("subscription.renewal.failed", json(fallo("2026-04-01T00:00:00.000Z", 1, "pi_a")), null);
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
    }

    @Test
    @DisplayName("S-03: subscription.canceled (compat) solo baja si ONVO confirma canceled")
    void canceladoSoloConGet() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0003")).thenReturn((Map) subOnvo("clsub0003", "active", "live", "price_pyme"));
        var body = json("{\"subscriptionId\":\"clsub0003\"}");
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.canceled", body, null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        verify(suscripcionService, never()).procesarSuscripcionOnvoEliminada(any());
        when(onvo.obtenerSuscripcion("clsub0003")).thenReturn((Map) subOnvo("clsub0003", "canceled", "live", "price_pyme"));
        handler.manejarSiBilling("subscription.canceled", body, null);
        verify(suscripcionService).procesarSuscripcionOnvoEliminada("clsub0003");
    }
}
