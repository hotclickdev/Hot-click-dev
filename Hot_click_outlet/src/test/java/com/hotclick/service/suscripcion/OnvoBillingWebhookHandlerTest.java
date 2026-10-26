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
    @Mock OnvoBillingDespachoTx tx;
    OnvoBillingWebhookHandler handler;

    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, StripeEvento> eventos = new HashMap<>();

    @BeforeEach
    void setUp() {
        handler = new OnvoBillingWebhookHandler(eventoRepo, suscripcionService, onvo, planRepo, suscripcionRepo, tx);
        when(tx.enTx(any())).thenAnswer(i -> ((java.util.function.Supplier<?>) i.getArgument(0)).get());
        when(tx.aparte(any())).thenAnswer(i -> ((java.util.function.Supplier<?>) i.getArgument(0)).get());
        when(eventoRepo.insertarSiNoExiste(anyString(), any(), any())).thenAnswer(i -> {
            String id = i.getArgument(0);
            if (eventos.containsKey(id)) return 0;
            StripeEvento e = new StripeEvento();
            e.setStripeEventId(id);
            e.setTipo(i.getArgument(1));
            e.setProcesadoOk(false);
            eventos.put(id, e);
            return 1;
        });
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
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", body, null)).isTrue(); // M2: permanente → 200
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getProcesadoOk()).isFalse();
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getError()).isEqualTo(OnvoBillingWebhookHandler.PREFIJO_RECHAZADO + "rechazo:modo");
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
        "status", "succeeded", "currency", "CRC", "amount", 1_200_000, "customerId", "cus_1",
        "subscriptionId", "clsub0001");

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
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        var body = json("{\"id\":\"pi_1\",\"mode\":\"live\",\"subscriptionId\":\"clsub0001\",\"metadata\":{\"plan_id\":\"999\"}}");
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
    @DisplayName("M1: subscriptionId en el cuerpo que el GET del intent no confirma → checkout, no billing")
    void subscriptionIdNoConfirmadoPorGet() throws Exception {
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("clsub0001")).thenReturn(Optional.of(local("clsub0001")));
        Map<String, Object> intent = new HashMap<>(INTENT_OK);
        intent.remove("subscriptionId");
        when(onvo.obtenerPaymentIntent("pi_1")).thenReturn((Map) intent);
        assertThat(handler.manejarSiBilling("payment-intent.succeeded",
            json("{\"id\":\"pi_1\",\"mode\":\"live\",\"subscriptionId\":\"clsub0001\"}"), null)).isFalse();
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
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        assertThat(handler.manejarSiBilling("payment-intent.succeeded",
            json("{\"id\":\"pi_1\",\"mode\":\"live\",\"subscriptionId\":\"clsub0001\"}"), null)).isTrue();
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos.get("onvo_payment-intent.succeeded_pi_1").getError()).isEqualTo(OnvoBillingWebhookHandler.PREFIJO_RECHAZADO + "rechazo:pago_parcial");
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
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getError()).isEqualTo(OnvoBillingWebhookHandler.PREFIJO_RECHAZADO + "rechazo:pago_parcial");
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
             "invoiceStatus":"open","subscriptionStatus":"past_due","invoicePeriodStart":"%s",
             "error":{"id":"clerr0002","mode":"live","type":"processing_error","code":"declined"}}"""
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
        assertThat(handler.manejarSiBilling("subscription.renewal.failed",
                json("{\"subscriptionId\":\"clsub0002\"}"), null)).isTrue(); // M2: permanente → 200
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

    // ---- Seguridad ciclo 2 ----

    @Test
    @DisplayName("C2-3: intent confirmado por ONVO pero sin suscripción local todavía → transitorio (5xx), no checkout ni rechazo")
    void suscripcionLocalPendienteEsTransitoria() throws Exception {
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("clsub0001")).thenReturn(Optional.empty());
        when(onvo.obtenerPaymentIntent("pi_1")).thenReturn((Map) INTENT_OK);
        assertThatThrownBy(() -> handler.procesar("payment-intent.succeeded",
            json("{\"id\":\"pi_1\",\"mode\":\"live\",\"subscriptionId\":\"clsub0001\"}"), null))
            .isInstanceOf(OnvoBillingWebhookHandler.SuscripcionLocalPendiente.class);
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        assertThat(eventos.get("onvo_payment-intent.succeeded_pi_1").getError())
            .doesNotStartWith(OnvoBillingWebhookHandler.PREFIJO_RECHAZADO);
    }

    @Test
    @DisplayName("C2-3: RecursoNoEncontrado / IllegalState del servicio son transitorios (5xx) y la reentrega se reprocesa")
    void recursoNoEncontradoEsTransitorio() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "live", 1_200_000));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "live", "price_pyme"));
        org.mockito.Mockito.doThrow(new com.hotclick.exception.RecursoNoEncontradoException("Suscripción ONVO", "clsub0001"))
            .doThrow(new IllegalStateException("plan"))
            .doNothing()
            .when(suscripcionService).procesarPagoOnvoVerificado(any(), any(), any());
        assertThatThrownBy(() -> handler.procesar("subscription.renewal.succeeded", json(RENOVACION_DOC), null))
            .isInstanceOf(java.util.NoSuchElementException.class);
        assertThatThrownBy(() -> handler.procesar("subscription.renewal.succeeded", json(RENOVACION_DOC), null))
            .isInstanceOf(IllegalStateException.class);
        assertThat(handler.procesar("subscription.renewal.succeeded", json(RENOVACION_DOC), null))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.PROCESADO);
        assertThat(eventos.get("onvo_subscription.renewal.succeeded_clinv0001").getProcesadoOk()).isTrue();
    }

    @Test
    @DisplayName("C2-3: solo EventoBillingRechazado permanente es rechazo de negocio")
    void esRechazoDeNegocioSoloPermanente() {
        assertThat(OnvoBillingWebhookHandler.esRechazoDeNegocio(new com.hotclick.exception.RecursoNoEncontradoException("x", "y"))).isFalse();
        assertThat(OnvoBillingWebhookHandler.esRechazoDeNegocio(new IllegalStateException())).isFalse();
        assertThat(OnvoBillingWebhookHandler.esRechazoDeNegocio(new IllegalArgumentException())).isFalse();
        assertThat(OnvoBillingWebhookHandler.esRechazoDeNegocio(new OnvoBillingWebhookHandler.EventoBillingRechazado("m", "estado"))).isFalse();
        assertThat(OnvoBillingWebhookHandler.esRechazoDeNegocio(new OnvoBillingWebhookHandler.EventoBillingRechazado("m", "monto"))).isTrue();
    }

    /** payment-intent.failed como en docs.onvopay.com/webhooks: sin data.mode, con data.error.mode. */
    private static String intentFallido(String modoError) {
        return """
            {"id":"clpiment0002","accountId":"clacct0001","currency":"CRC","status":"requires_payment_method",
             "subscriptionId":"clsub0002","customerId":"clcus0002",
             "error":{"id":"clerr0001","mode":"%s","paymentMethodType":"card","message":"declined"}}"""
            .formatted(modoError);
    }

    @Test
    @DisplayName("C3: renewal.failed sin data.mode y con data.error.mode del ambiente se procesa (GET live)")
    void renewalFailedSinDataModeSeProcesa() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) subOnvo("clsub0002", "past_due", "live", "price_pyme"));
        assertThat(handler.procesar("subscription.renewal.failed", json(fallo("2026-04-01T00:00:00.000Z", 2, "pi_a")), null))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.PROCESADO);
        verify(suscripcionService).procesarRenovacionOnvoFallida("clsub0002");
    }

    @Test
    @DisplayName("C3: payment-intent.failed sin data.mode y con data.error.mode se procesa tras GET del intent y de la sub")
    void intentFallidoSinDataModeSeProcesa() throws Exception {
        Map<String, Object> intent = new HashMap<>(Map.of("id", "clpiment0002", "mode", "live",
            "status", "requires_payment_method", "subscriptionId", "clsub0002"));
        when(onvo.obtenerPaymentIntent("clpiment0002")).thenReturn((Map) intent);
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("clsub0002")).thenReturn(Optional.of(local("clsub0002")));
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) subOnvo("clsub0002", "past_due", "live", "price_pyme"));
        assertThat(handler.procesar("payment-intent.failed", json(intentFallido("live")), null))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.PROCESADO);
        verify(suscripcionService).procesarRenovacionOnvoFallida("clsub0002");
        assertThat(eventos.get("onvo_payment-intent.failed_clpiment0002").getProcesadoOk()).isTrue();
    }

    @Test
    @DisplayName("C3: data.error.mode de otro ambiente → RECHAZADO registrado, sin GET de la sub ni efecto")
    void errorModeDistintoRechaza() throws Exception {
        var body = json(fallo("2026-04-01T00:00:00.000Z", 1, "pi_a").replace("\"mode\":\"live\"", "\"mode\":\"test\""));
        assertThat(handler.procesar("subscription.renewal.failed", body, null))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.RECHAZADO);
        verify(onvo, never()).obtenerSuscripcion(any());
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
        assertThat(eventos.get("onvo_subscription.renewal.failed_clsub0002_2026-04-01T00:00:00.000Z").getError())
            .isEqualTo(OnvoBillingWebhookHandler.PREFIJO_RECHAZADO + "rechazo:modo");
    }

    @Test
    @DisplayName("C3: payload sin mode pero GET con otro mode → RECHAZADO registrado (2xx), no se procesa")
    void getConOtroModoRechaza() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) subOnvo("clsub0002", "past_due", "test", "price_pyme"));
        var body = json(fallo("2026-04-01T00:00:00.000Z", 1, "pi_a").replace(",\"mode\":\"live\"", ""));
        assertThat(handler.procesar("subscription.renewal.failed", body, null))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.RECHAZADO);
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
        assertThat(eventos.get("onvo_subscription.renewal.failed_clsub0002_2026-04-01T00:00:00.000Z").getError())
            .isEqualTo(OnvoBillingWebhookHandler.PREFIJO_RECHAZADO + "rechazo:modo");

        Map<String, Object> intent = Map.of("id", "clpiment0002", "mode", "test", "subscriptionId", "clsub0002");
        when(onvo.obtenerPaymentIntent("clpiment0002")).thenReturn((Map) intent);
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("clsub0002")).thenReturn(Optional.of(local("clsub0002")));
        assertThat(handler.procesar("payment-intent.failed", json(intentFallido("live")), null))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.RECHAZADO);
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
    }

    @Test
    @DisplayName("C3: GET a ONVO caído → transitorio (5xx), el evento queda reprocesable")
    void getCaidoEsTransitorio() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0002")).thenThrow(new org.springframework.web.client.ResourceAccessException("timeout"));
        assertThatThrownBy(() -> handler.procesar("subscription.renewal.failed", json(fallo("2026-04-01T00:00:00.000Z", 1, "pi_a")), null))
            .isInstanceOf(org.springframework.web.client.ResourceAccessException.class);
        assertThat(eventos.get("onvo_subscription.renewal.failed_clsub0002_2026-04-01T00:00:00.000Z").getError())
            .isEqualTo("ResourceAccessException");
    }

    @Test
    @DisplayName("C3: payment-intent.failed de checkout (sin subscriptionId, como la doc) no es billing")
    void intentFallidoDeCheckoutNoEsBilling() throws Exception {
        var body = json("{\"id\":\"clpiment0002\",\"status\":\"requires_payment_method\",\"error\":{\"mode\":\"test\"}}");
        assertThat(handler.procesar("payment-intent.failed", body, null)).isEqualTo(OnvoBillingWebhookHandler.Resultado.NO_BILLING);
        assertThat(eventos).isEmpty();
    }

    @Test
    @DisplayName("C2-4: llave sin modo esperado → RECHAZADO (fail-closed)")
    void sinModoEsperadoRechaza() throws Exception {
        when(onvo.modoEsperado()).thenReturn(null);
        assertThat(handler.procesar("subscription.renewal.succeeded", json(RENOVACION_DOC), null))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.RECHAZADO);
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("C2-5: CR/LF y controles se reemplazan y el largo se acota")
    void saneaLogYError() {
        assertThat(OnvoBillingWebhookHandler.limpio("a\r\nFAKE LOG\u0000", 50)).isEqualTo("a__FAKE LOG_");
        assertThat(OnvoBillingWebhookHandler.limpio("x".repeat(500))).hasSize(OnvoBillingWebhookHandler.MAX_LOG);
        assertThat(OnvoBillingWebhookHandler.limpio(null, 5)).isNull();
    }

    @Test
    @DisplayName("C2-5: eventId con CR/LF o más largo que la PK → RECHAZADO sin despacho ni fila")
    void eventIdInvalidoRechaza() throws Exception {
        assertThat(handler.procesar("subscription.renewal.succeeded", json(RENOVACION_DOC), "evt\r\nINFO falso"))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.RECHAZADO);
        assertThat(handler.procesar("subscription.renewal.succeeded", json(RENOVACION_DOC), "e".repeat(200)))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.RECHAZADO);
        verify(onvo, never()).obtenerRenovacion(any());
        assertThat(eventos).isEmpty();
    }

    @Test
    @DisplayName("C2-2: el rechazo permanente se marca en una transacción aparte, el despacho va en enTx")
    void rechazoMarcaEnTxAparte() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice("clinv0001", "clsub0001", "paid", "test", 1_200_000));
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) subOnvo("clsub0001", "active", "test", "price_pyme"));
        handler.procesar("subscription.renewal.succeeded", json(RENOVACION_DOC), null);
        var orden = org.mockito.Mockito.inOrder(tx);
        orden.verify(tx).enTx(any());
        orden.verify(tx).aparte(any());
    }
}
