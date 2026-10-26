package com.hotclick.service.suscripcion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.StripeEvento;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.service.onvo.OnvoBillingClient.FiltroFactura;
import com.hotclick.service.onvo.OnvoBillingClient.Recurso;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler.CobroNoVerificadoException;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.springframework.transaction.support.TransactionOperations;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.client.ResourceAccessException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Activación de planes ONVO solo con lo que ONVO devuelve por GET (los ids y llaves son ficticios). */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Webhook billing ONVO verificado por GET")
class OnvoBillingWebhookHandlerTest {

    static final long EMPRESA = 10L;
    static final long PLAN_ID = 2L;
    static final int PRECIO_COLONES = 15_000;

    @Mock StripeEventoRepository eventoRepo;
    @Mock SuscripcionService suscripcionService;
    @Mock OnvoBillingClient onvo;
    @Mock SuscripcionRepository suscripcionRepo;
    @Mock PlanRepository planRepo;
    SimpleMeterRegistry metrics = new SimpleMeterRegistry();
    OnvoBillingWebhookHandler handler;

    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, StripeEvento> tabla = new HashMap<>();
    Suscripcion local;
    static final String P_INI = "2026-10-12T21:21:10.587Z";
    static final String P_FIN = "2026-11-12T21:21:10.587Z";
    static final java.time.LocalDate FIN_CR = java.time.LocalDate.of(2026, 11, 12);

    @BeforeEach
    void setUp() {
        // Tabla de idempotencia en memoria.
        when(eventoRepo.findByIdForUpdate(anyString())).thenAnswer(i -> Optional.ofNullable(tabla.get(i.getArgument(0, String.class))));
        when(eventoRepo.findById(anyString())).thenAnswer(i -> Optional.ofNullable(tabla.get(i.getArgument(0, String.class))));
        when(eventoRepo.save(any())).thenAnswer(i -> {
            StripeEvento e = i.getArgument(0);
            if (e.getProcesadoOk() == null) e.setProcesadoOk(false);
            tabla.put(e.getStripeEventId(), e);
            return e;
        });

        Empresa empresa = new Empresa();
        empresa.setId(EMPRESA);
        Suscripcion local = new Suscripcion();
        local.setEmpresa(empresa);
        local.setOnvoSubscriptionId("sub_abc");
        local.setOnvoCustomerId("cus_abc");
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_abc")).thenReturn(Optional.of(local));
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("sub_abc")).thenReturn(Optional.of(local));
        this.local = local;
        // Reserva atómica (INSERT ... ON CONFLICT DO NOTHING) sobre la tabla en memoria.
        when(eventoRepo.reservar(anyString(), anyString(), any())).thenAnswer(i -> {
            String id = i.getArgument(0, String.class);
            if (tabla.containsKey(id)) return 0;
            StripeEvento e = new StripeEvento();
            e.setStripeEventId(id);
            e.setProcesadoOk(true);
            tabla.put(id, e);
            return 1;
        });

        Plan pyme = new Plan();
        pyme.setId(PLAN_ID);
        pyme.setNombre("PYME");
        pyme.setPrecioMensual(PRECIO_COLONES);
        when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(pyme));
        when(onvo.planParaPriceId("price_pyme")).thenReturn("PYME");
        when(onvo.obtener(any(), anyString())).thenReturn(Optional.empty());
        when(onvo.buscarFactura(any(), anyString(), any())).thenReturn(Optional.empty());
        handler = new OnvoBillingWebhookHandler(eventoRepo, suscripcionService, onvo, suscripcionRepo, planRepo,
            TransactionOperations.withoutTransaction(), metrics);
    }


    /** Subscription según openapi l.3601: items[].priceId, customerId, latestInvoice (opcional). */
    static Map<String, Object> sub(String status, String customer, Map<String, Object> latestInvoice) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", "sub_abc");
        m.put("status", status);
        m.put("customerId", customer);
        m.put("items", List.of(Map.of("id", "si_1", "priceId", "price_pyme", "quantity", 1)));
        if (latestInvoice != null) m.put("latestInvoice", latestInvoice);
        m.put("currentPeriodStart", P_INI);
        m.put("currentPeriodEnd", P_FIN);
        return m;
    }

    /** Invoice según openapi l.3751: status, total (centavos), currency, subscriptionId. */
    static Map<String, Object> inv(String id, String status, long total, String currency) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("status", status);
        m.put("total", total);
        m.put("currency", currency);
        m.put("subscriptionId", "sub_abc");
        m.put("customerId", "cus_abc");
        m.put("paymentIntentId", "pi_1");
        m.put("periodStart", P_INI);
        m.put("periodEnd", P_FIN);
        return m;
    }

    static final long OK_TOTAL = PRECIO_COLONES * 100L;

    JsonNode renovacionOk(String invId) {
        return mapper.valueToTree(Map.of("id", invId, "subscriptionId", "sub_abc", "status", "paid",
            "total", OK_TOTAL, "currency", "CRC"));
    }

    JsonNode renovacionFallida(String subscriptionStatusDelCuerpo) {
        return mapper.valueToTree(Map.of("subscriptionId", "sub_abc", "paymentIntentId", "pi_9",
            "subscriptionStatus", subscriptionStatusDelCuerpo, "invoiceStatus", "open"));
    }

    void onvoSub(Map<String, Object> s) {
        when(onvo.obtener(Recurso.SUSCRIPCION, "sub_abc")).thenReturn(Optional.of(s));
        // GET /v1/invoices/{id}: por defecto devuelve la latestInvoice si la hay.
        if (s.get("latestInvoice") instanceof Map<?, ?> li) onvoInv((Map<String, Object>) li);
    }

    void onvoInv(Map<String, Object> inv) {
        when(onvo.obtener(Recurso.FACTURA, (String) inv.get("id"))).thenReturn(Optional.of(inv));
    }

    double rechazos(String motivo) {
        var c = metrics.find("onvo_billing_rechazo_total").tag("motivo", motivo).counter();
        return c == null ? 0 : c.count();
    }

    // ── B2: renovación exitosa ─────────────────────────────────────────────────────────

    @Test @DisplayName("B2: renewal.succeeded con invoice paid (latestInvoice) activa una sola vez")
    void renovacionPagadaActiva() {
        onvoSub(sub("active", "cus_abc", inv("clinv_1", "paid", OK_TOTAL, "CRC")));
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_1")).isTrue();
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_1b")).isTrue();
        verify(suscripcionService, times(1)).procesarPagoOnvoExitoso(EMPRESA, "sub_abc", PLAN_ID, FIN_CR);
    }

    @Test @DisplayName("R-1: si latestInvoice es otra, GET /v1/invoices/{id}; mismo período que currentPeriod → activa")
    void renovacionLeidaPorIdMismoPeriodo() {
        onvoSub(sub("active", "cus_abc", inv("clinv_nueva", "open", OK_TOTAL, "CRC")));
        onvoInv(inv("clinv_1", "paid", OK_TOTAL, "CRC"));
        handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_1");
        verify(onvo, never()).buscarFactura(any(), anyString(), any());
        verify(suscripcionService).procesarPagoOnvoExitoso(EMPRESA, "sub_abc", PLAN_ID, FIN_CR);
    }

    @Test @DisplayName("B2: invoice open/void (aunque el cuerpo diga paid) → 5xx, sin activar ni persistir")
    void renovacionNoPagadaReintenta() {
        for (String st : List.of("open", "draft", "void", "uncollectible")) {
            onvoSub(sub("active", "cus_abc", inv("clinv_1", st, OK_TOTAL, "CRC")));
            assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_" + st))
                .isInstanceOf(CobroNoVerificadoException.class);
        }
        verifyNoInteractions(suscripcionService);
        assertThat(tabla).isEmpty();
    }

    @Test @DisplayName("404: renovación que ONVO (aún) no devuelve → 5xx transitorio, sin activar ni registrar")
    void renovacionInexistente() {
        onvoSub(sub("active", "cus_abc", null));
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_falsa"), "evt_1"))
            .isInstanceOf(CobroNoVerificadoException.class);
        verifyNoInteractions(suscripcionService);
        assertThat(tabla).isEmpty();
    }

    @Test @DisplayName("404: suscripción que ONVO (aún) no devuelve → 5xx transitorio")
    void suscripcionInexistenteTransitoria() {
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.failed", renovacionFallida("past_due"), "evt_f"))
            .isInstanceOf(CobroNoVerificadoException.class);
        assertThat(tabla).isEmpty();
    }

    // ── R-1: replay de una factura paid vieja ─────────────────────────────────────────

    @Test @DisplayName("R-1: factura paid vieja (ni latest ni período actual) → 2xx + alerta, no extiende")
    void facturaViejaNoExtiende() {
        onvoSub(sub("active", "cus_abc", inv("clinv_actual", "paid", OK_TOTAL, "CRC")));
        Map<String, Object> vieja = inv("clinv_vieja", "paid", OK_TOTAL, "CRC");
        vieja.put("periodStart", "2026-06-12T21:21:10.587Z");
        vieja.put("periodEnd", "2026-07-12T21:21:10.587Z");
        onvoInv(vieja);
        assertThat(handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_vieja"), "evt_replay")).isTrue();
        verifyNoInteractions(suscripcionService);
        assertThat(rechazos("renovacion_no_vigente")).isEqualTo(1);
        assertThat(tabla).doesNotContainKey(OnvoBillingWebhookHandler.claveCobro("sub_abc", "inv_clinv_vieja"));
    }

    @Test @DisplayName("R-1: fechaFin = Invoice.periodEnd (fecha CR), no hoy + 1 mes")
    void fechaFinDesdePeriodEnd() {
        onvoSub(sub("active", "cus_abc", inv("clinv_1", "paid", OK_TOTAL, "CRC")));
        handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_1");
        verify(suscripcionService).procesarPagoOnvoExitoso(EMPRESA, "sub_abc", PLAN_ID, java.time.LocalDate.of(2026, 11, 12));
    }

    @Test @DisplayName("R-1: factura sin periodEnd → 2xx + alerta, sin activar")
    void sinPeriodo() {
        Map<String, Object> i = inv("clinv_1", "paid", OK_TOTAL, "CRC");
        i.remove("periodEnd");
        onvoSub(sub("active", "cus_abc", i));
        handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_1");
        verifyNoInteractions(suscripcionService);
        assertThat(rechazos("periodo_desconocido")).isEqualTo(1);
    }

    // ── R-2: reserva atómica + lock de la Suscripcion local ─────────────────────────────

    @Test @DisplayName("R-2: la clave ya reservada por otra entrega (reservar=0) → no aplica de nuevo")
    void reservaPerdidaNoAplica() {
        when(eventoRepo.reservar(anyString(), anyString(), any())).thenReturn(0);
        onvoSub(sub("active", "cus_abc", inv("clinv_1", "paid", OK_TOTAL, "CRC")));
        handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_2");
        verify(suscripcionService, never()).procesarPagoOnvoExitoso(anyLong(), anyString(), anyLong(), any());
        assertThat(tabla.get("onvo_evt_2").getError()).isEqualTo("cobro_duplicado");
    }

    @Test @DisplayName("R-2: dos entregas del mismo cobro con event ids distintos aplican una sola vez")
    void dosEntregasUnaVez() {
        onvoSub(sub("active", "cus_abc", inv("clinv_1", "paid", OK_TOTAL, "CRC")));
        handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_a");
        handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_b");
        verify(suscripcionService, times(1)).procesarPagoOnvoExitoso(anyLong(), anyString(), anyLong(), any());
        verify(suscripcionRepo, times(1)).findByOnvoSubscriptionIdForUpdate("sub_abc");
    }

    @Test @DisplayName("R-2: la Suscripcion local desapareció/cambió tras la fase 1 → no aplica")
    void localCambioTrasLock() {
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("sub_abc")).thenReturn(Optional.empty());
        onvoSub(sub("active", "cus_abc", inv("clinv_1", "paid", OK_TOTAL, "CRC")));
        handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_1");
        verifyNoInteractions(suscripcionService);
        assertThat(tabla.get("onvo_evt_1").getError()).isEqualTo("suscripcion_local_cambio");
    }

    @Test @DisplayName("R-2: renewal.failed con el período ya pagado localmente (tras el lock) → no baja a mora")
    void moraNoPisaActivacion() {
        local.setEstado("ACTIVO");
        local.setFechaFin(FIN_CR);
        onvoSub(sub("past_due", "cus_abc", null));
        handler.manejarSiBilling("subscription.renewal.failed", renovacionFallida("past_due"), "evt_f1");
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(anyString());
        assertThat(tabla.get("onvo_evt_f1").getError()).isEqualTo("mora_periodo_ya_cubierto");
    }

    @Test @DisplayName("B2: monto o moneda distintos al plan → 2xx + alerta, sin activar")
    void montoDistinto() {
        onvoSub(sub("active", "cus_abc", inv("clinv_1", "paid", 100L, "CRC")));
        handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_1");
        onvoSub(sub("active", "cus_abc", inv("clinv_2", "paid", OK_TOTAL, "USD")));
        handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_2"), "evt_2");
        verifyNoInteractions(suscripcionService);
        assertThat(rechazos("monto_o_moneda_distintos")).isEqualTo(2);
    }

    @Test @DisplayName("B2: suscripción de otro customer → 2xx + alerta")
    void customerAjeno() {
        onvoSub(sub("active", "cus_otro", inv("clinv_1", "paid", OK_TOTAL, "CRC")));
        handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_1");
        verifyNoInteractions(suscripcionService);
        assertThat(rechazos("suscripcion_ajena")).isEqualTo(1);
    }

    @Test @DisplayName("B2: GET falla/timeout → 5xx, sin cambios ni registro")
    void getFallaRenovacion() {
        when(onvo.obtener(Recurso.SUSCRIPCION, "sub_abc")).thenThrow(new ResourceAccessException("timeout"));
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_1"))
            .isInstanceOf(CobroNoVerificadoException.class);
        verifyNoInteractions(suscripcionService);
        assertThat(tabla).isEmpty();
    }

    @Test @DisplayName("Primer cobro: payment-intent.succeeded → GET intent + invoice por paymentIntentId")
    void primerCobro() {
        when(onvo.obtener(Recurso.PAYMENT_INTENT, "pi_1")).thenReturn(Optional.of(Map.of("id", "pi_1", "status", "succeeded")));
        when(onvo.buscarFactura(FiltroFactura.PAYMENT_INTENT, "pi_1", null))
            .thenReturn(Optional.of(inv("clinv_1", "paid", OK_TOTAL, "CRC")));
        onvoSub(sub("active", "cus_abc", null));
        JsonNode data = mapper.valueToTree(Map.of("id", "pi_1", "metadata", Map.of("empresa_id", "999", "plan_id", "99")));
        handler.manejarSiBilling("payment-intent.succeeded", data, "evt_pi");
        // empresa y plan salen de la BD local y de ONVO, no de la metadata del cuerpo
        verify(suscripcionService).procesarPagoOnvoExitoso(EMPRESA, "sub_abc", PLAN_ID, FIN_CR);
        // el mismo cobro llega luego como renewal.succeeded: no se aplica dos veces
        onvoSub(sub("active", "cus_abc", inv("clinv_1", "paid", OK_TOTAL, "CRC")));
        handler.manejarSiBilling("subscription.renewal.succeeded", renovacionOk("clinv_1"), "evt_ren");
        verify(suscripcionService, times(1)).procesarPagoOnvoExitoso(anyLong(), anyString(), anyLong(), any());
    }

    // ── B1: renovación fallida ─────────────────────────────────────────────────────────

    @Test @DisplayName("B1: renewal.failed solo pasa a mora si ONVO dice past_due/unpaid")
    void fallidaConMoraReal() {
        onvoSub(sub("past_due", "cus_abc", null));
        handler.manejarSiBilling("subscription.renewal.failed", renovacionFallida("past_due"), "evt_f1");
        verify(suscripcionService).procesarRenovacionOnvoFallida("sub_abc");
        verify(suscripcionService, never()).procesarSuscripcionOnvoEliminada(anyString());
    }

    @Test @DisplayName("B1: cuerpo dice past_due pero ONVO dice active → sin cambio")
    void fallidaFalsificada() {
        onvoSub(sub("active", "cus_abc", null));
        handler.manejarSiBilling("subscription.renewal.failed", renovacionFallida("past_due"), "evt_f1");
        verifyNoInteractions(suscripcionService);
    }

    @Test @DisplayName("B1: ONVO dice canceled → baja (downgrade)")
    void fallidaCancelada() {
        onvoSub(sub("canceled", "cus_abc", null));
        handler.manejarSiBilling("subscription.renewal.failed", renovacionFallida("past_due"), "evt_f1");
        verify(suscripcionService).procesarSuscripcionOnvoEliminada("sub_abc");
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(anyString());
    }

    @Test @DisplayName("B1: GET falla → 5xx, sin mora ni registro (ONVO reintenta)")
    void fallidaGetFalla() {
        when(onvo.obtener(Recurso.SUSCRIPCION, "sub_abc")).thenThrow(new IllegalStateException("sin llave"));
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.failed", renovacionFallida("past_due"), "evt_f1"))
            .isInstanceOf(CobroNoVerificadoException.class);
        verifyNoInteractions(suscripcionService);
        assertThat(tabla).isEmpty();
    }

    @Test @DisplayName("B1: suscripción desconocida localmente o de otro customer → 2xx + alerta")
    void fallidaAjena() {
        onvoSub(sub("past_due", "cus_otro", null));
        handler.manejarSiBilling("subscription.renewal.failed", renovacionFallida("past_due"), "evt_f1");
        verifyNoInteractions(suscripcionService);
        assertThat(rechazos("suscripcion_ajena")).isEqualTo(1);
    }

    @Test @DisplayName("B1: eventos no documentados por ONVO (deleted/canceled/invoice.*) se ignoran sin GET")
    void noDocumentados() {
        JsonNode data = mapper.valueToTree(Map.of("id", "sub_abc", "status", "canceled"));
        for (String t : List.of("subscription.deleted", "subscription.canceled", "invoice.payment_failed",
                "invoice.payment_succeeded", "subscription.payment_succeeded")) {
            assertThat(handler.manejarSiBilling(t, data, "evt_" + t)).isTrue();
        }
        verifyNoInteractions(suscripcionService);
        verify(onvo, never()).obtener(any(), anyString());
        assertThat(rechazos("evento_no_documentado")).isEqualTo(5);
    }

    @Test @DisplayName("Eventos no billing (payment-intent sin metadata) no se tocan")
    void noBilling() {
        JsonNode data = mapper.valueToTree(Map.of("id", "pi_1"));
        assertThat(handler.manejarSiBilling("payment-intent.succeeded", data, "evt_x")).isFalse();
        assertThat(handler.manejarSiBilling("checkout-session.succeeded", data, "evt_y")).isFalse();
    }

    @Test @DisplayName("Clave de cobro cabe en la columna (≤100)")
    void claveLarga() {
        assertThat(OnvoBillingWebhookHandler.claveCobro("s".repeat(90), "inv_" + "x".repeat(40))).hasSizeLessThanOrEqualTo(100);
    }
}
