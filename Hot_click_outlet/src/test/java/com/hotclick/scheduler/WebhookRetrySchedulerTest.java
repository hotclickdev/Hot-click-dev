package com.hotclick.scheduler;

import com.hotclick.model.WebhookEvent;
import com.hotclick.payment.PayPalPaymentProvider;
import com.hotclick.repository.WebhookEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * FIX-19 — WebhookRetryScheduler: reintentos con límite MAX_REINTENTOS=5.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("FIX-19 — WebhookRetryScheduler: reintentos con límite")
class WebhookRetrySchedulerTest {

    @Mock WebhookEventRepository webhookEventRepository;
    @Mock PayPalPaymentProvider  payPalProvider;

    @InjectMocks WebhookRetryScheduler scheduler;

    private WebhookEvent eventoPendiente;
    private WebhookEvent eventoAgotado;

    @BeforeEach
    void setUp() {
        eventoPendiente = new WebhookEvent();
        eventoPendiente.setMerchantToken("evt_001");
        eventoPendiente.setEventoTipo("PAYMENT.CAPTURE.COMPLETED");
        eventoPendiente.setIntentosReintento(0);
        eventoPendiente.setFechaRecepcion(LocalDateTime.now().minusMinutes(10));

        eventoAgotado = new WebhookEvent();
        eventoAgotado.setMerchantToken("evt_002");
        eventoAgotado.setEventoTipo("PAYMENT.CAPTURE.COMPLETED");
        eventoAgotado.setIntentosReintento(5); // ← ya agotado
        eventoAgotado.setFechaRecepcion(LocalDateTime.now().minusHours(1));
    }

    // ── Caso feliz: evento con 0 intentos → se reintenta ─────────────────────

    @Test
    @DisplayName("Evento con intentos=0 → reintentarProcesamiento() llamado")
    void reintentarPendientes_eligibleEvent_processingCalled() {
        when(webhookEventRepository.findPendientesParaReintento(any()))
            .thenReturn(List.of(eventoPendiente));
        doNothing().when(payPalProvider).reintentarProcesamiento(eventoPendiente);

        scheduler.reintentarPendientes();

        verify(payPalProvider, times(1)).reintentarProcesamiento(eventoPendiente);
    }

    // ── Caso límite: evento con intentos=5 → NO se reintenta ─────────────────

    @Test
    @DisplayName("Evento con intentos=5 (MAX_REINTENTOS) → NO se llama reintentarProcesamiento")
    void reintentarPendientes_exhaustedEvent_skipped() {
        when(webhookEventRepository.findPendientesParaReintento(any()))
            .thenReturn(List.of(eventoAgotado));

        scheduler.reintentarPendientes();

        verify(payPalProvider, never()).reintentarProcesamiento(any());
    }

    // ── Caso mixto: 1 elegible + 1 agotado ───────────────────────────────────

    @Test
    @DisplayName("1 elegible + 1 agotado → solo el elegible se procesa")
    void reintentarPendientes_mixedEvents_onlyEligibleProcessed() {
        when(webhookEventRepository.findPendientesParaReintento(any()))
            .thenReturn(List.of(eventoPendiente, eventoAgotado));
        doNothing().when(payPalProvider).reintentarProcesamiento(any());

        scheduler.reintentarPendientes();

        // Solo el evento con 0 intentos se procesa
        verify(payPalProvider, times(1)).reintentarProcesamiento(eventoPendiente);
        verify(payPalProvider, never()).reintentarProcesamiento(eventoAgotado);
    }

    // ── Caso: sin eventos pendientes → no hace nada ───────────────────────────

    @Test
    @DisplayName("Sin eventos pendientes → no llama a PayPal")
    void reintentarPendientes_noEvents_noop() {
        when(webhookEventRepository.findPendientesParaReintento(any()))
            .thenReturn(Collections.emptyList());

        scheduler.reintentarPendientes();

        verify(payPalProvider, never()).reintentarProcesamiento(any());
    }

    // ── Caso error: reintento falla → continúa con siguiente ─────────────────

    @Test
    @DisplayName("Error en reintento → excepción capturada, scheduler continúa")
    void reintentarPendientes_processingFails_continuesWithNext() {
        WebhookEvent evento2 = new WebhookEvent();
        evento2.setMerchantToken("evt_003");
        evento2.setEventoTipo("PAYMENT.CAPTURE.DENIED");
        evento2.setIntentosReintento(1);
        evento2.setFechaRecepcion(LocalDateTime.now().minusMinutes(15));

        when(webhookEventRepository.findPendientesParaReintento(any()))
            .thenReturn(List.of(eventoPendiente, evento2));

        // Primer evento lanza excepción no manejada
        doThrow(new RuntimeException("PayPal down"))
            .when(payPalProvider).reintentarProcesamiento(eventoPendiente);
        doNothing().when(payPalProvider).reintentarProcesamiento(evento2);

        // No debe propagarse
        assertThatNoException().isThrownBy(() -> scheduler.reintentarPendientes());

        // Segundo evento SÍ se procesó
        verify(payPalProvider, times(1)).reintentarProcesamiento(evento2);
    }

    // ── Verificar que el corte de tiempo es correcto (>5 minutos) ────────────

    @Test
    @DisplayName("findPendientesParaReintento() recibe un corte ≥ 5 minutos en el pasado")
    void reintentarPendientes_correctCutoffTime() {
        when(webhookEventRepository.findPendientesParaReintento(any()))
            .thenReturn(Collections.emptyList());

        LocalDateTime antes = LocalDateTime.now().minusMinutes(6);
        scheduler.reintentarPendientes();
        LocalDateTime despues = LocalDateTime.now().minusMinutes(4);

        // Capturar el argumento de corte
        var captor = org.mockito.ArgumentCaptor.forClass(LocalDateTime.class);
        verify(webhookEventRepository).findPendientesParaReintento(captor.capture());
        LocalDateTime corte = captor.getValue();

        // El corte debe estar entre "hace 6 min" y "hace 4 min"
        assertThat(corte).isBefore(despues);
        assertThat(corte).isAfter(antes);
    }
}
