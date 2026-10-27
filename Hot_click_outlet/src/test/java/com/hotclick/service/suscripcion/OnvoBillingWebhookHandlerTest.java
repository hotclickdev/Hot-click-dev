package com.hotclick.service.suscripcion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.StripeEvento;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Webhook billing ONVO | S-02 verificación contra ONVO y S-04 idempotencia")
class OnvoBillingWebhookHandlerTest {

    @Mock StripeEventoRepository eventoRepo;
    @Mock SuscripcionService suscripcionService;
    @Mock SuscripcionRepository suscripcionRepo;
    @Mock OnvoBillingClient onvo;

    private OnvoBillingWebhookHandler handler;
    private final ObjectMapper mapper = new ObjectMapper();
    /** Ledger en memoria: simula hot_click_stripe_evento_tb. */
    private final Map<String, StripeEvento> ledger = new HashMap<>();

    private Suscripcion local;
    private Map<String, Object> subRemota;
    private Map<String, Object> intentRemoto;

    @BeforeEach
    void armar() {
        handler = new OnvoBillingWebhookHandler(eventoRepo, suscripcionService, suscripcionRepo, onvo);
        when(eventoRepo.findByIdForUpdate(anyString())).thenAnswer(i -> Optional.ofNullable(ledger.get(i.<String>getArgument(0))));
        when(eventoRepo.findById(anyString())).thenAnswer(i -> Optional.ofNullable(ledger.get(i.<String>getArgument(0))));
        when(eventoRepo.save(any())).thenAnswer(i -> {
            StripeEvento ev = i.getArgument(0);
            ledger.put(ev.getStripeEventId(), ev);
            return ev;
        });

        Empresa empresa = new Empresa();
        empresa.setId(10L);
        Plan plan = new Plan();
        plan.setId(2L);
        plan.setNombre("PYME");
        plan.setPrecioMensual(15000);
        local = new Suscripcion();
        local.setEmpresa(empresa);
        local.setPlan(plan);
        local.setOnvoSubscriptionId("sub_abc");
        local.setOnvoCustomerId("cus_10");
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("sub_abc")).thenReturn(Optional.of(local));

        when(onvo.modoEsperado()).thenReturn("live");
        when(onvo.getPriceIdForPlan("PYME")).thenReturn("price_pyme");
        subRemota = new HashMap<>(Map.of("id", "sub_abc", "mode", "live", "status", "active",
            "customerId", "cus_10", "currentPeriodEnd", "2026-12-01T06:00:00Z",
            "items", List.of(Map.of("priceId", "price_pyme"))));
        intentRemoto = new HashMap<>(Map.of("id", "pi_1", "status", "succeeded", "mode", "live",
            "currency", "CRC", "amount", 1_500_000, "subscriptionId", "sub_abc"));
        when(onvo.obtenerSuscripcion("sub_abc")).thenAnswer(i -> subRemota);
        when(onvo.obtenerPaymentIntent("pi_1")).thenAnswer(i -> intentRemoto);
    }

    private JsonNode json(String s) throws Exception {
        return mapper.readTree(s);
    }

    private static final String RENOVACION_OK = """
        {"id":"inv_1","subscriptionId":"sub_abc","paymentIntentId":"pi_1"}
        """;

    private boolean renovacionOk(String evt) throws Exception {
        return handler.manejarSiBilling("subscription.renewal.succeeded", json(RENOVACION_OK), evt);
    }

    @Nested
    @DisplayName("S-02")
    class S02 {

        @Test
        @DisplayName("GET succeeded con monto, moneda y modo correctos → activa el plan de la BD")
        void activaConGetCorrecto() throws Exception {
            assertThat(renovacionOk("evt_1")).isTrue();
            verify(suscripcionService).procesarPagoOnvoVerificado(10L, "sub_abc", LocalDate.of(2026, 12, 1));
            assertThat(ledger.get("onvo_evt_1").getProcesadoOk()).isTrue();
        }

        @Test
        @DisplayName("requires_payment_method → no activa")
        void intentNoSucceeded() throws Exception {
            intentRemoto.put("status", "requires_payment_method");
            assertThat(renovacionOk("evt_2")).isTrue();
            verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
            assertThat(ledger.get("onvo_evt_2").getProcesadoOk()).isFalse();
        }

        @Test
        @DisplayName("Monto menor al precio del plan → no activa")
        void montoMenor() throws Exception {
            intentRemoto.put("amount", 1_000_000);
            renovacionOk("evt_3");
            verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        }

        @Test
        @DisplayName("USD en vez de CRC → no activa")
        void monedaUsd() throws Exception {
            intentRemoto.put("currency", "USD");
            renovacionOk("evt_4");
            verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        }

        @Test
        @DisplayName("Intent en modo test con llave live → no activa")
        void modoTestEnLive() throws Exception {
            intentRemoto.put("mode", "test");
            renovacionOk("evt_5");
            verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        }

        @Test
        @DisplayName("Plan o empresa del payload que no coinciden con la BD → no activa")
        void metadataNoCoincide() throws Exception {
            handler.manejarSiBilling("subscription.renewal.succeeded", json("""
                {"id":"inv_1","subscriptionId":"sub_abc","paymentIntentId":"pi_1","metadata":{"empresa_id":"99","plan_id":"2"}}
                """), "evt_6");
            handler.manejarSiBilling("subscription.renewal.succeeded", json("""
                {"id":"inv_1","subscriptionId":"sub_abc","paymentIntentId":"pi_1","metadata":{"empresa_id":"10","plan_id":"7"}}
                """), "evt_7");
            verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        }

        @Test
        @DisplayName("Suscripción ONVO de otro customer o con otro price → no activa")
        void subRemotaAjena() throws Exception {
            subRemota.put("customerId", "cus_otro");
            renovacionOk("evt_8");
            subRemota.put("customerId", "cus_10");
            subRemota.put("items", List.of(Map.of("priceId", "price_negocio")));
            renovacionOk("evt_9");
            verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        }

        @Test
        @DisplayName("payment-intent.succeeded de suscripción desconocida → no activa (ni usa onvo_unknown_)")
        void intentSuscripcionDesconocida() throws Exception {
            when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("sub_x")).thenReturn(Optional.empty());
            handler.manejarSiBilling("payment-intent.succeeded", json("""
                {"id":"pi_9","subscriptionId":"sub_x","metadata":{"empresa_id":"10","plan_id":"2"}}
                """), "evt_10");
            verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        }

        @Test
        @DisplayName("Intent con metadata de billing pero sin subscriptionId ya no es billing")
        void intentSoloMetadataNoEsBilling() throws Exception {
            boolean billing = handler.manejarSiBilling("payment-intent.succeeded", json("""
                {"id":"pi_9","metadata":{"empresa_id":"10","plan_id":"2"}}
                """), "evt_11");
            assertThat(billing).isFalse();
            verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        }

        @Test
        @DisplayName("GET 404 o 5xx → no activa, queda pendiente y el reintento lo procesa")
        void getFallaYReintento() throws Exception {
            when(onvo.obtenerPaymentIntent("pi_1"))
                .thenThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND))
                .thenThrow(new HttpServerErrorException(HttpStatus.BAD_GATEWAY))
                .thenAnswer(i -> intentRemoto);
            assertThatThrownBy(() -> renovacionOk("evt_12")).isInstanceOf(HttpClientErrorException.class);
            assertThat(ledger.get("onvo_evt_12").getProcesadoOk()).isFalse();
            assertThatThrownBy(() -> renovacionOk("evt_12")).isInstanceOf(HttpServerErrorException.class);
            verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());

            assertThat(renovacionOk("evt_12")).isTrue();
            verify(suscripcionService).procesarPagoOnvoVerificado(eq(10L), eq("sub_abc"), any());
            assertThat(ledger.get("onvo_evt_12").getProcesadoOk()).isTrue();
        }

        @Test
        @DisplayName("Sin llave real (fail-closed) → excepción, no activa")
        void sinLlaveFailClosed() throws Exception {
            when(onvo.obtenerSuscripcion("sub_abc")).thenThrow(new IllegalStateException("sin llave"));
            assertThatThrownBy(() -> renovacionOk("evt_13")).isInstanceOf(IllegalStateException.class);
            verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        }
    }

    @Nested
    @DisplayName("S-04")
    class S04 {

        private JsonNode fallo(String extra) throws Exception {
            return json("{\"subscriptionId\":\"sub_abc\"" + extra + "}");
        }

        @Test
        @DisplayName("Dos renewal.failed de la misma sub con distinto paymentIntentId o periodStart se procesan los dos")
        void dosFallosDistintos() throws Exception {
            subRemota.put("status", "past_due");
            handler.manejarSiBilling("subscription.renewal.failed", fallo(",\"paymentIntentId\":\"pi_a\""), null);
            handler.manejarSiBilling("subscription.renewal.failed", fallo(",\"paymentIntentId\":\"pi_b\""), null);
            handler.manejarSiBilling("subscription.renewal.failed", fallo(",\"periodStart\":\"2026-10-01\""), null);
            handler.manejarSiBilling("subscription.renewal.failed", fallo(",\"periodStart\":\"2026-11-01\""), null);
            verify(suscripcionService, times(4)).procesarRenovacionOnvoFallida("sub_abc");
        }

        @Test
        @DisplayName("El mismo evento reenviado se procesa una sola vez")
        void reenvioUnaVez() throws Exception {
            subRemota.put("status", "past_due");
            handler.manejarSiBilling("subscription.renewal.failed", fallo(",\"paymentIntentId\":\"pi_a\""), null);
            handler.manejarSiBilling("subscription.renewal.failed", fallo(",\"paymentIntentId\":\"pi_a\""), null);
            subRemota.put("status", "active");
            renovacionOk("evt_r");
            renovacionOk("evt_r");
            verify(suscripcionService, times(1)).procesarRenovacionOnvoFallida("sub_abc");
            verify(suscripcionService, times(1)).procesarPagoOnvoVerificado(any(), any(), any());
        }

        @Test
        @DisplayName("Con id raíz no se usa el fallback")
        void idRaizManda() throws Exception {
            JsonNode d = fallo(",\"paymentIntentId\":\"pi_a\"");
            assertThat(OnvoBillingWebhookHandler.eventIdParaIdempotencia("subscription.renewal.failed", d, "evt_77"))
                .isEqualTo("onvo_evt_77");
        }

        @Test
        @DisplayName("Tras procesadoOk=false el reenvío se reintenta")
        void reintentoTrasFallo() throws Exception {
            subRemota.put("status", "past_due");
            when(onvo.obtenerSuscripcion("sub_abc"))
                .thenThrow(new HttpServerErrorException(HttpStatus.SERVICE_UNAVAILABLE))
                .thenAnswer(i -> subRemota);
            JsonNode d = fallo(",\"invoiceId\":\"inv_9\"");
            assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.failed", d, null))
                .isInstanceOf(HttpServerErrorException.class);
            handler.manejarSiBilling("subscription.renewal.failed", d, null);
            verify(suscripcionService, times(1)).procesarRenovacionOnvoFallida("sub_abc");
        }

        @Test
        @DisplayName("succeeded y failed del mismo período tienen llaves distintas")
        void exitoYFalloLlavesDistintas() throws Exception {
            JsonNode d = fallo(",\"periodStart\":\"2026-10-01\"");
            String ok = OnvoBillingWebhookHandler.eventIdParaIdempotencia("subscription.renewal.succeeded", d, null);
            String ko = OnvoBillingWebhookHandler.eventIdParaIdempotencia("subscription.renewal.failed", d, null);
            assertThat(ok).isNotNull().isNotEqualTo(ko);
        }

        @Test
        @DisplayName("Sin discriminador no hay dedupe duro: se procesa por estado, sin fila de ledger")
        void sinDiscriminador() throws Exception {
            subRemota.put("status", "past_due");
            assertThat(OnvoBillingWebhookHandler.eventIdParaIdempotencia("subscription.renewal.failed", fallo(""), null))
                .isNull();
            handler.manejarSiBilling("subscription.renewal.failed", fallo(""), null);
            handler.manejarSiBilling("subscription.renewal.failed", fallo(""), null);
            verify(suscripcionService, times(2)).procesarRenovacionOnvoFallida("sub_abc");
            assertThat(ledger).isEmpty();
        }
    }

    @Nested
    @DisplayName("QA")
    class Qa {

        @Test
        @DisplayName("Fuera de orden: renewal.failed viejo después de un cobro OK no degrada")
        void falloTardioNoDegrada() throws Exception {
            renovacionOk("evt_ok_nov");
            // ONVO ya reporta la suscripción activa: el fallo de octubre llega tarde.
            handler.manejarSiBilling("subscription.renewal.failed", json("""
                {"subscriptionId":"sub_abc","periodStart":"2026-10-01"}
                """), "evt_fail_oct");
            verify(suscripcionService).procesarPagoOnvoVerificado(eq(10L), eq("sub_abc"), any());
            verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
            assertThat(ledger.get("onvo_evt_fail_oct").getProcesadoOk()).isTrue();
        }

        @Test
        @DisplayName("Fuera de orden: cobro OK que llega tras la cancelación no reactiva")
        void exitoTrasCancelacion() throws Exception {
            subRemota.put("status", "canceled");
            handler.manejarSiBilling("subscription.canceled", json("{\"subscriptionId\":\"sub_abc\"}"), "evt_c");
            verify(suscripcionService).procesarSuscripcionOnvoEliminada("sub_abc");
            // ONVO reporta la suscripción cancelada: el cobro viejo (intent succeeded) no reactiva.
            renovacionOk("evt_viejo");
            verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
        }

        @Test
        @DisplayName("Cancelación ONVO confirmada por GET → degrada; reenvío no duplica")
        void cancelacion() throws Exception {
            subRemota.put("status", "canceled");
            JsonNode d = json("{\"subscriptionId\":\"sub_abc\"}");
            handler.manejarSiBilling("subscription.canceled", d, "evt_can");
            handler.manejarSiBilling("subscription.canceled", d, "evt_can");
            verify(suscripcionService, times(1)).procesarSuscripcionOnvoEliminada("sub_abc");
        }

        @Test
        @DisplayName("Cancelación falsa (ONVO dice active) → no degrada")
        void cancelacionNoConfirmada() throws Exception {
            handler.manejarSiBilling("subscription.deleted", json("{\"subscriptionId\":\"sub_abc\"}"), "evt_fake");
            verify(suscripcionService, never()).procesarSuscripcionOnvoEliminada(any());
            assertThat(ledger.get("onvo_evt_fake").getProcesadoOk()).isFalse();
        }
    }
}
