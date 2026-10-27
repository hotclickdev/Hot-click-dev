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
@DisplayName("Webhook billing ONVO (S-02, S-04)")
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
        m.put("currentPeriodStart", "2026-11-01T06:00:00.000Z");
        m.put("latestInvoiceId", "clinv_alta");
        m.put("metadata", Map.of("empresa_id", "10", "plan_id", "3", "plan_nombre", "PYME"));
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

    /** Factura del alta con la forma real de ONVO (sandbox): paymentIntentId + subscriptionId. */
    private static Map<String, Object> facturaAlta(String intentId) {
        Map<String, Object> m = invoice("clinv_alta", "clsub0001", "paid", "live", 1_200_000);
        m.put("paymentIntentId", intentId);
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
    @DisplayName("S-02: la suscripción local es de otro customer que el que confirma ONVO → rechazo, no activa")
    void suscripcionLocalDeOtroCustomerNoActiva() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "live", 1_200_000));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        Suscripcion local = new Suscripcion();
        local.setOnvoCustomerId("cus_de_otra_empresa");
        when(suscripcionRepo.findByOnvoSubscriptionId("clsub0001")).thenReturn(Optional.of(local));

        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null)).isTrue(); // permanente → 200
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());

        local.setOnvoCustomerId("cus_1");
        eventos.clear();
        handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null);
        verify(suscripcionService).procesarPagoOnvoVerificado("clsub0001", "PYME", LocalDate.of(2026, 12, 1));
    }

    @Test
    @DisplayName("S-02 repro: cuerpo con mode test y total 1 ya no activa; ONVO por GET dice test → rechazo")
    void cuerpoFalsoModoTestNoActiva() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "test", 1_200_000));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "test", "price_pyme"));
        var body = json("""
            {"id":"clinv0001","mode":"test","subscriptionId":"clsub0001","total":1}""");
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", body, null)).isTrue(); // M2: permanente → 200
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getProcesadoOk()).isFalse();
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getError()).isEqualTo("rechazo:modo");
    }

    @Test
    @DisplayName("S-02: sin mode en la respuesta de ONVO se rechaza (fail-closed)")
    void sinModoRechaza() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", null, 1_200_000));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null)).isTrue(); // M2: permanente → 200
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
            assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null)).isTrue(); // M2: permanente → 200
        }
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("A5-01 MEDIO: factura con el monto COMPLETO del plan configurado se acepta con el plan del priceId")
    void facturaConMontoCompletoAceptada() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_plus"));
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "live", 2_500_000));
        handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null);
        verify(suscripcionService).procesarPagoOnvoVerificado("clsub0001", "NEGOCIO_PLUS", LocalDate.of(2026, 12, 1));
    }

    @Test
    @DisplayName("A5-01 MEDIO: factura pagada con monto MENOR al precio del plan NO activa el plan completo (rechazo permanente)")
    void facturaMenorAlPlanNoActiva() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_plus"));
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "live", 830_000));
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null)).isTrue();
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getError()).isEqualTo("rechazo:pago_parcial");
    }

    @Test
    @DisplayName("A5-01 MEDIO: factura con monto MAYOR al precio del plan tampoco activa (no coincide con el catálogo)")
    void facturaMayorAlPlanNoActiva() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "live", 1_200_001));
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null)).isTrue();
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getError()).isEqualTo("rechazo:monto");
    }

    @Test
    @DisplayName("S-02: renovación de otro customer o sin subscriptionId en la factura → rechazo")
    void renovacionDeOtroCustomer() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        Map<String, Object> inv = invoice("clinv0001", "clsub0001", "paid", "live", 1_200_000);
        inv.put("customerId", "cus_otro");
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) inv);
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null)).isTrue(); // M2: permanente → 200
        Map<String, Object> inv2 = invoice("clinv0001", null, "paid", "live", 1_200_000);
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) inv2);
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null)).isTrue(); // M2: permanente → 200
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("S-02: renovación sin id → rechazo, sin registrar evento")
    void sinIdRechaza() throws Exception {
        var body = json("{\"subscriptionId\":\"clsub0001\",\"mode\":\"live\"}");
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", body, null)).isTrue(); // M2: permanente → 200
        verify(onvo, never()).obtenerRenovacion(any());
    }

    private static final Map<String, Object> INTENT_OK = Map.of("id", "pi_1", "mode", "live",
        "status", "succeeded", "currency", "CRC", "amount", 1_200_000,
        "customer", Map.of("id", "cus_1"));

    private static Suscripcion local(String subId) {
        Suscripcion l = new Suscripcion();
        l.setOnvoSubscriptionId(subId);
        return l;
    }

    @Test
    @DisplayName("M1: metadata.empresa_id se ignora; subscriptionId sin suscripción local → no es billing (checkout)")
    void intentConMetadataAjenaNoActiva() throws Exception {
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("clsub_x")).thenReturn(Optional.empty());
        var body = json("{\"id\":\"pi_1\",\"subscriptionId\":\"clsub_x\",\"metadata\":{\"empresa_id\":\"10\",\"plan_id\":\"3\"}}");
        assertThat(handler.manejarSiBilling("payment-intent.succeeded", body, null)).isFalse();
        verify(suscripcionRepo, never()).findActivaByEmpresaId(any());
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos).isEmpty();
    }

    @Test
    @DisplayName("M1: alta por intent atribuida por subscriptionId local (lock) y confirmada por GET del intent")
    void altaPorIntentVerificada() throws Exception {
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("clsub0001")).thenReturn(Optional.of(local("clsub0001")));
        when(onvo.obtenerPaymentIntent("pi_1")).thenReturn((Map) INTENT_OK);
        when(onvo.obtenerRenovacion("clinv_alta")).thenReturn((Map) facturaAlta("pi_1"));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        var body = json("{\"id\":\"pi_1\",\"subscriptionId\":\"clsub0001\",\"metadata\":{\"plan_id\":\"999\"}}");
        assertThat(handler.manejarSiBilling("payment-intent.succeeded", body, null)).isTrue();
        verify(suscripcionService).procesarPagoOnvoVerificado("clsub0001", "PYME", LocalDate.of(2026, 12, 1));
    }

    @Test
    @DisplayName("M1 regresión: el mismo customer con suscripción paga un checkout → no es billing, la venta sigue su flujo")
    void checkoutDeCustomerConSuscripcionNoEsBilling() throws Exception {
        assertThat(handler.manejarSiBilling("payment-intent.succeeded",
            json("{\"id\":\"pi_venta\",\"customerId\":\"cus_1\",\"metadata\":{\"empresa_id\":\"5\"}}"), null)).isFalse();
        verify(onvo, never()).obtenerPaymentIntent(any());
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos).isEmpty();
    }

    @Test
    @DisplayName("M1: subscriptionId en el cuerpo que la factura de ONVO (paymentIntentId) no confirma → checkout, no billing")
    void subscriptionIdNoConfirmadoPorGet() throws Exception {
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("clsub0001")).thenReturn(Optional.of(local("clsub0001")));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        when(onvo.obtenerRenovacion("clinv_alta")).thenReturn((Map) facturaAlta("pi_de_otro_cobro"));
        assertThat(handler.manejarSiBilling("payment-intent.succeeded",
            json("{\"id\":\"pi_1\",\"subscriptionId\":\"clsub0001\"}"), null)).isFalse();
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos).isEmpty();
    }

    @Test
    @DisplayName("B1: alta por intent con pago parcial no activa el plan (200, ledger rechazo:pago_parcial)")
    void altaParcialNoActiva() throws Exception {
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("clsub0001")).thenReturn(Optional.of(local("clsub0001")));
        Map<String, Object> intent = new HashMap<>(INTENT_OK);
        intent.put("amount", 600_000);
        when(onvo.obtenerPaymentIntent("pi_1")).thenReturn((Map) intent);
        when(onvo.obtenerRenovacion("clinv_alta")).thenReturn((Map) facturaAlta("pi_1"));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        assertThat(handler.manejarSiBilling("payment-intent.succeeded",
            json("{\"id\":\"pi_1\",\"subscriptionId\":\"clsub0001\"}"), null)).isTrue();
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos.get("onvo_payment-intent.succeeded_pi_1").getError()).isEqualTo("rechazo:pago_parcial");
    }

    @Test
    @DisplayName("B1: factura con saldo pendiente no activa el plan")
    void facturaConSaldoPendiente() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        Map<String, Object> inv = invoice("clinv0001", "clsub0001", "paid", "live", 1_200_000);
        inv.put("amountPaid", 600_000);
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) inv);
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null)).isTrue();
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getError()).isEqualTo("rechazo:pago_parcial");
    }

    @Test
    @DisplayName("M2/B2: rechazo transitorio (GET caído) → excepción (5xx) y en el ledger va la clase, no el mensaje")
    void errorTransitorioLanzaYGuardaClase() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenThrow(new IllegalStateException("secreto cus_1 token=abc"));
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null))
            .isInstanceOf(IllegalStateException.class);
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getError()).isEqualTo("IllegalStateException");
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
    @DisplayName("S-04: renewal.failed sin invoicePeriodStart toma el período de currentPeriodStart de ONVO (no se descarta)")
    void falloSinPeriodoUsaPeriodoDeOnvo() throws Exception {
        Map<String, Object> sub = subOnvo("clsub0002", "past_due", "live", "price_pyme");
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) sub);
        var cuerpo = json("{\"subscriptionId\":\"clsub0002\"}");
        handler.manejarSiBilling("subscription.renewal.failed", cuerpo, null);
        handler.manejarSiBilling("subscription.renewal.failed", cuerpo, null); // mismo período: dedupe
        verify(suscripcionService, times(1)).procesarRenovacionOnvoFallida("clsub0002");
        assertThat(eventos).containsKey("onvo_subscription.renewal.failed_clsub0002_2026-11-01T06:00:00.000Z");
        Map<String, Object> siguiente = new HashMap<>(sub);
        siguiente.put("currentPeriodStart", "2026-12-01T06:00:00.000Z");
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) siguiente);
        handler.manejarSiBilling("subscription.renewal.failed", cuerpo, null); // otro período: se procesa
        verify(suscripcionService, times(2)).procesarRenovacionOnvoFallida("clsub0002");
    }

    @Test
    @DisplayName("S-04: sin invoicePeriodStart y ONVO sin currentPeriodStart → rechazo permanente (200); GET caído → excepción")
    void falloSinPeriodoNiEnOnvo() throws Exception {
        Map<String, Object> sub = subOnvo("clsub0002", "past_due", "live", "price_pyme");
        sub.remove("currentPeriodStart");
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) sub);
        assertThat(handler.manejarSiBilling("subscription.renewal.failed",
                json("{\"subscriptionId\":\"clsub0002\"}"), null)).isTrue(); // M2: permanente → 200
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
        when(onvo.obtenerSuscripcion("clsub0002")).thenThrow(new IllegalStateException("caído"));
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.failed",
                json("{\"subscriptionId\":\"clsub0002\"}"), null)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("S-04: período de ONVO con modo distinto al de la llave → no hay clave, rechazo permanente")
    void periodoDeOnvoConOtroModo() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) subOnvo("clsub0002", "past_due", "test", "price_pyme"));
        assertThat(handler.manejarSiBilling("subscription.renewal.failed",
                json("{\"subscriptionId\":\"clsub0002\"}"), null)).isTrue();
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
    }

    private static Suscripcion localConEmpresa(String subId, String customerId, Long empresaId) {
        Suscripcion l = local(subId);
        l.setOnvoCustomerId(customerId);
        com.hotclick.model.Empresa e = new com.hotclick.model.Empresa();
        e.setId(empresaId);
        l.setEmpresa(e);
        return l;
    }

    @Test
    @DisplayName("Fila local sin onvo_customer_id: solo activa si la metadata de la suscripción en ONVO (GET) es de la misma empresa")
    void customerLocalNuloSoloPorMetadataDeOnvo() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "live", 1_200_000));
        // misma empresa en la metadata de ONVO → activa
        when(suscripcionRepo.findByOnvoSubscriptionId("clsub0001")).thenReturn(Optional.of(localConEmpresa("clsub0001", null, 10L)));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null);
        verify(suscripcionService, times(1)).procesarPagoOnvoVerificado("clsub0001", "PYME", LocalDate.of(2026, 12, 1));
        // empresa distinta → rechazo
        eventos.clear();
        when(suscripcionRepo.findByOnvoSubscriptionId("clsub0001")).thenReturn(Optional.of(localConEmpresa("clsub0001", null, 77L)));
        handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null);
        // sin metadata → rechazo
        eventos.clear();
        Map<String, Object> sinMeta = subOnvo("clsub0001", "active", "live", "price_pyme");
        sinMeta.remove("metadata");
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) sinMeta);
        when(suscripcionRepo.findByOnvoSubscriptionId("clsub0001")).thenReturn(Optional.of(localConEmpresa("clsub0001", null, 10L)));
        handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null);
        verify(suscripcionService, times(1)).procesarPagoOnvoVerificado(any(), any(), any()); // solo la primera
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getError()).isEqualTo("rechazo:customer");
    }

    @Test
    @DisplayName("Ids con forma inválida (path traversal / query) no llegan al GET: rechazo permanente (200)")
    void idsInvalidosNoLlegaAlGet() throws Exception {
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded",
            json("{\"id\":\"../customers\",\"subscriptionId\":\"clsub0001\"}"), null)).isTrue();
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded",
            json("{\"id\":\"clinv0001\",\"subscriptionId\":\"a/b?x=1\"}"), null)).isTrue();
        assertThat(handler.manejarSiBilling("subscription.renewal.failed",
            json("{\"subscriptionId\":\"x\\u0020y\"}"), null)).isTrue();
        verify(onvo, never()).obtenerRenovacion(any());
        verify(onvo, never()).obtenerSuscripcion(any());
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
    }

    @Test
    @DisplayName("Forma real de ONVO: sin amountRemaining; el paymentIntent embebido con receivedAmount < total no activa")
    void facturaConPagoRecibidoParcial() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        Map<String, Object> inv = invoice("clinv0001", "clsub0001", "paid", "live", 1_200_000);
        inv.put("paymentIntent", Map.of("status", "succeeded", "amount", 1_200_000, "receivedAmount", 600_000));
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) inv);
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null)).isTrue();
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getError()).isEqualTo("rechazo:pago_parcial");
        // pago completo con la misma forma real → activa
        eventos.clear();
        inv.put("paymentIntent", Map.of("status", "succeeded", "amount", 1_200_000, "receivedAmount", 1_200_000));
        handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_DOC), null);
        verify(suscripcionService).procesarPagoOnvoVerificado("clsub0001", "PYME", LocalDate.of(2026, 12, 1));
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
