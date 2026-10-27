package com.hotclick.service.suscripcion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Plan;
import com.hotclick.model.StripeEvento;
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

/** QA área 5: casos negativos de S-02 / S-04 (reconsulta nula/caída, duplicados, fuera de orden, JSON incompleto, cancelación). */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Webhook billing ONVO | casos negativos QA área 5")
class OnvoBillingWebhookNegativosTest {
    @Mock StripeEventoRepository eventoRepo;
    @Mock SuscripcionService suscripcionService;
    @Mock OnvoBillingClient onvo;
    @Mock PlanRepository planRepo;
    @Mock SuscripcionRepository suscripcionRepo;
    OnvoBillingWebhookHandler handler;
    final ObjectMapper mapper = new ObjectMapper();
    final Map<String, StripeEvento> eventos = new HashMap<>();

    @BeforeEach
    void setUp() {
        handler = new OnvoBillingWebhookHandler(eventoRepo, suscripcionService, onvo, planRepo, suscripcionRepo);
        when(eventoRepo.findByIdForUpdate(anyString())).thenAnswer(i -> Optional.ofNullable(eventos.get((String) i.getArgument(0))));
        when(eventoRepo.findById(anyString())).thenAnswer(i -> Optional.ofNullable(eventos.get((String) i.getArgument(0))));
        when(eventoRepo.save(any())).thenAnswer(i -> { StripeEvento e = i.getArgument(0); eventos.put(e.getStripeEventId(), e); return e; });
        when(onvo.modoEsperado()).thenReturn("live");
        when(onvo.planParaPriceId("price_pyme")).thenReturn("PYME");
        Plan p = new Plan(); p.setNombre("PYME"); p.setPrecioMensual(12000);
        when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(p));
    }

    JsonNode json(String s) throws Exception { return mapper.readTree(s); }

    Map<String, Object> sub(String status) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", "clsub0001"); m.put("status", status); m.put("mode", "live"); m.put("customerId", "cus_1");
        m.put("currentPeriodStart", "2026-11-01T06:00:00.000Z");
        m.put("currentPeriodEnd", "2026-12-01T06:00:00.000Z");
        m.put("items", List.of(Map.of("id", "item_1", "priceId", "price_pyme")));
        return m;
    }

    Map<String, Object> invoice() {
        Map<String, Object> m = new HashMap<>();
        m.put("id", "clinv0001"); m.put("subscriptionId", "clsub0001"); m.put("status", "paid"); m.put("mode", "live");
        m.put("currency", "CRC"); m.put("customerId", "cus_1"); m.put("total", 1_200_000L); m.put("periodEnd", "2026-12-01T06:00:00.000Z");
        return m;
    }

    static final String REN = "{\"id\":\"clinv0001\",\"subscriptionId\":\"clsub0001\"}";

    @Test
    void reconsultaDevuelveNullNoActiva() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn(null);
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn(null);
        handler.manejarSiBilling("subscription.renewal.succeeded", json(REN), null);
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
        assertThat(eventos.values()).allMatch(e -> !Boolean.TRUE.equals(e.getProcesadoOk()));
    }

    @Test
    void reconsultaCaidaLanzaNoActivaYReintentoActivaUnaVez() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenThrow(new IllegalStateException("onvo down"));
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", json(REN), null))
            .isInstanceOf(IllegalStateException.class);
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
        StripeEvento ev = eventos.get("onvo_subscription.renewal.succeeded_clinv0001");
        assertThat(ev.getProcesadoOk()).isNotEqualTo(Boolean.TRUE);

        // ONVO se recupera: el reintento sí activa, una sola vez
        org.mockito.Mockito.doReturn(invoice()).when(onvo).obtenerRenovacion("clinv0001");
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) sub("active"));
        handler.manejarSiBilling("subscription.renewal.succeeded", json(REN), null);
        verify(suscripcionService, times(1)).procesarPagoOnvoVerificado("clsub0001", "PYME", LocalDate.of(2026, 12, 1), "clinv0001");
    }

    @Test
    void suscripcionNoActivaEnOnvoLanzaYNoActiva() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice());
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) sub("incomplete"));
        assertThatThrownBy(() -> handler.manejarSiBilling("subscription.renewal.succeeded", json(REN), null))
            .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    void mismoEventoRepetidoTresVecesActivaUnaSolaVez() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice());
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) sub("active"));
        for (int i = 0; i < 3; i++) handler.manejarSiBilling("subscription.renewal.succeeded", json(REN), null);
        verify(suscripcionService, times(1)).procesarPagoOnvoVerificado(any(), any(), any(), any());
        verify(onvo, times(1)).obtenerRenovacion("clinv0001");
        // y con id de evento arriba (eventIdRaw) también
        eventos.clear();
        for (int i = 0; i < 2; i++) handler.manejarSiBilling("subscription.renewal.succeeded", json(REN), "evt_1");
        verify(suscripcionService, times(2)).procesarPagoOnvoVerificado(any(), any(), any(), any()); // 1 previo + 1 nuevo
    }

    @Test
    void fallaDelMismoPeriodoRepetidaNoDuplica() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) sub("past_due"));
        String f = "{\"subscriptionId\":\"clsub0001\",\"invoicePeriodStart\":\"2026-11-01T06:00:00.000Z\"}";
        for (int i = 0; i < 4; i++) handler.manejarSiBilling("subscription.renewal.failed", json(f), null);
        verify(suscripcionService, times(1)).procesarRenovacionOnvoFallida("clsub0001");
    }

    @Test
    void fueraDeOrdenFallaViejaTrasPagoConOnvoActivaNoDegrada() throws Exception {
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) invoice());
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) sub("active"));
        handler.manejarSiBilling("subscription.renewal.succeeded", json(REN), null);
        String vieja = "{\"subscriptionId\":\"clsub0001\",\"invoicePeriodStart\":\"2026-10-01T06:00:00.000Z\"}";
        handler.manejarSiBilling("subscription.renewal.failed", json(vieja), null);
        verify(suscripcionService, times(1)).procesarPagoOnvoVerificado(any(), any(), any(), any());
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
        verify(suscripcionService, never()).procesarSuscripcionOnvoEliminada(any());
    }

    @Test
    void jsonDeBillingIncompletoNoActivaNiLanza500() throws Exception {
        for (String body : new String[]{"{}", "{\"id\":null}", "{\"subscriptionId\":\"clsub0001\"}", "{\"id\":\"clinv0001\"}"}) {
            handler.manejarSiBilling("subscription.renewal.succeeded", json(body), null);
        }
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    void cancelacionPorGetSoloConfirmadaPorOnvo() throws Exception {
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) sub("canceled"));
        String f = "{\"subscriptionId\":\"clsub0001\",\"invoicePeriodStart\":\"2026-11-01T06:00:00.000Z\"}";
        handler.manejarSiBilling("subscription.renewal.failed", json(f), null);
        verify(suscripcionService, times(1)).procesarSuscripcionOnvoEliminada("clsub0001");
        // GET null en renewal.failed: no cancela ni degrada
        eventos.clear();
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn(null);
        try { handler.manejarSiBilling("subscription.renewal.failed", json(f), null); } catch (RuntimeException ignored) { }
        verify(suscripcionService, times(1)).procesarSuscripcionOnvoEliminada("clsub0001");
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
    }

    /** Captura los logs del handler para comprobar que todo rechazo deja alerta [ALERTA-PAGO]. */
    private ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> capturarLogs() {
        var appender = new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();
        appender.start();
        ((ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(OnvoBillingWebhookHandler.class)).addAppender(appender);
        return appender;
    }

    private static long alertas(ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> appender) {
        return appender.list.stream().filter(e -> e.getFormattedMessage().contains("[ALERTA-PAGO]")).count();
    }

    @Test
    void rechazoPermanenteSeRegistraResponde200YDejaAlerta() throws Exception {
        var logs = capturarLogs();
        Map<String, Object> enDolares = invoice();
        enDolares.put("currency", "USD");
        when(onvo.obtenerRenovacion("clinv0001")).thenReturn((Map) enDolares);
        when(onvo.obtenerSuscripcion("clsub0001")).thenReturn((Map) sub("active"));

        boolean atendido = handler.manejarSiBilling("subscription.renewal.succeeded", json(REN), null);

        assertThat(atendido).isTrue(); // 200: reintentar no lo arregla
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
        StripeEvento ev = eventos.get("onvo_subscription.renewal.succeeded_clinv0001");
        assertThat(ev.getProcesadoOk()).isFalse();
        assertThat(ev.getError()).isEqualTo("rechazo:moneda"); // código, nunca el mensaje de la excepción
        assertThat(alertas(logs)).isEqualTo(1);
    }

    @Test
    void rechazoPermanenteSinClaveDeIdempotenciaTambienDejaAlerta() throws Exception {
        var logs = capturarLogs();
        boolean atendido = handler.manejarSiBilling("subscription.renewal.succeeded", json("{}"), null);
        assertThat(atendido).isTrue();
        assertThat(eventos).isEmpty();
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
        assertThat(alertas(logs)).isEqualTo(1);
    }
}
