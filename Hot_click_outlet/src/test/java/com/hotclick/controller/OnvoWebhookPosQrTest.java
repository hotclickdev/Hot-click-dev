package com.hotclick.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.service.OnvoService;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Webhook ONVO: POS QR vs tienda")
class OnvoWebhookPosQrTest {

    @Mock OnvoService onvoService;
    @Mock OnvoPaymentProvider onvoPaymentProvider;
    @Mock PosQrVentaService posQrVentaService;
    @Mock OnvoBillingWebhookHandler billingWebhookHandler;

    private OnvoWebhookController controller;

    @BeforeEach
    void armar() {
        controller = new OnvoWebhookController(
            onvoService, onvoPaymentProvider, posQrVentaService, billingWebhookHandler, new ObjectMapper());
        when(onvoService.getWebhookSecret()).thenReturn("secret-onvo");
        when(billingWebhookHandler.manejarSiBilling(any(), any(), any())).thenReturn(false);
    }

    @Test
    @DisplayName("El webhook ONVO ya no completa sesiones POS (el POS cobra con Tilopay)")
    void webhookOnvoNoTocaPos() {
        ResponseEntity<Map<String, String>> res = controller.recibirWebhookOnvo(
            "{\"type\":\"payment-intent.succeeded\",\"data\":{\"id\":\"pi_pos\"}}",
            "secret-onvo");
        assertThat(res.getStatusCode().value()).isEqualTo(200);
        verify(posQrVentaService, never()).completarSiPagoPasarela(any());
        verify(onvoPaymentProvider, never()).procesarPagoExitoso(any(), any(), any());
    }

    @Test
    @DisplayName("Pago de tienda sigue el flujo ONVO normal")
    void pagoTiendaSiNoEsPosQr() {
        ResponseEntity<Map<String, String>> res = controller.recibirWebhookOnvo(
            "{\"type\":\"checkout-session.succeeded\",\"data\":{\"id\":\"sess_tienda\"}}",
            "secret-onvo");
        assertThat(res.getStatusCode().value()).isEqualTo(200);
        verify(posQrVentaService, never()).completarSiPagoPasarela(any());
        verify(onvoPaymentProvider).procesarPagoExitoso(eq("sess_tienda"), any(), eq("webhook"));
    }

    @Test
    @DisplayName("Evento de billing SaaS no pasa por POS ni tienda")
    void billingNoPasaPorPosNiTienda() {
        when(billingWebhookHandler.manejarSiBilling(any(), any(), any())).thenReturn(true);

        ResponseEntity<Map<String, String>> res = controller.recibirWebhookOnvo(
            "{\"id\":\"evt_1\",\"type\":\"subscription.renewal.succeeded\",\"data\":{\"id\":\"sub_1\"}}",
            "secret-onvo");

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        assertThat(res.getBody()).containsEntry("scope", "billing");
        verify(posQrVentaService, never()).completarSiPagoPasarela(any());
        verify(onvoPaymentProvider, never()).procesarPagoExitoso(any(), any(), any());
    }
}
