package com.hotclick.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** QA: JSON malformado en billing ONVO → 400, sin tocar ledger, suscripciones ni ONVO; lo siguiente sigue funcionando. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Webhook ONVO billing | JSON malformado → 400 sin efectos")
class OnvoWebhookBillingJsonMalformadoTest {

    private static final String SECRET = "webhook_secret_prueba";

    @Mock OnvoService onvoService;
    @Mock OnvoPaymentProvider onvoPaymentProvider;
    @Mock PosQrVentaService posQrVentaService;
    @Mock StripeEventoRepository eventoRepo;
    @Mock SuscripcionService suscripcionService;
    @Mock SuscripcionRepository suscripcionRepo;
    @Mock OnvoBillingClient onvoBilling;

    private OnvoWebhookController controller;

    @BeforeEach
    void armar() {
        OnvoBillingWebhookHandler handler =
            new OnvoBillingWebhookHandler(eventoRepo, suscripcionService, suscripcionRepo, onvoBilling);
        controller = new OnvoWebhookController(
            onvoService, onvoPaymentProvider, posQrVentaService, handler, new ObjectMapper());
        when(onvoService.getWebhookSecret()).thenReturn(SECRET);
    }

    @Test
    @DisplayName("Cuerpos malformados → 400 y ningún efecto")
    void malformado400() {
        for (String body : new String[] {
            "{\"type\":\"subscription.renewal.succeeded\",\"data\":{\"subscriptionId\":\"sub_abc\"",
            "no-es-json",
            "{\"type\":\"subscription.canceled\",\"data\":}"}) {
            assertThat(controller.recibirWebhookOnvo(body, SECRET).getStatusCode().value()).isEqualTo(400);
        }
        verifyNoInteractions(eventoRepo, suscripcionService, suscripcionRepo, onvoBilling, onvoPaymentProvider);
    }

    @Test
    @DisplayName("Tras un JSON malformado, un evento válido se procesa normal")
    void noRompeLoSiguiente() {
        controller.recibirWebhookOnvo("{roto", SECRET);
        when(eventoRepo.findByIdForUpdate(anyString())).thenReturn(Optional.empty());
        when(eventoRepo.findById(anyString())).thenReturn(Optional.empty());
        when(eventoRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate("sub_abc")).thenReturn(Optional.empty());
        int estado = controller.recibirWebhookOnvo(
            "{\"id\":\"evt_1\",\"type\":\"subscription.renewal.succeeded\",\"data\":{\"subscriptionId\":\"sub_abc\",\"paymentIntentId\":\"pi_1\"}}",
            SECRET).getStatusCode().value();
        // Suscripción desconocida → rechazo definitivo (200, sin activar).
        assertThat(estado).isEqualTo(200);
        verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }
}
