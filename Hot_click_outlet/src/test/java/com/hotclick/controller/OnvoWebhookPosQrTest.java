package com.hotclick.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.service.OnvoService;
import com.hotclick.service.pos.PosQrVentaService;
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

    private OnvoWebhookController controller;

    @BeforeEach
    void armar() {
        controller = new OnvoWebhookController(
            onvoService, onvoPaymentProvider, posQrVentaService, new ObjectMapper());
        when(onvoService.getWebhookSecret()).thenReturn("secret-onvo");
    }

    @Test
    @DisplayName("Pago POS QR no dispara el checkout de la tienda")
    void pagoPosQrNoPasaPorTienda() {
        when(posQrVentaService.completarSiPagoPasarela("sess_pos")).thenReturn(true);

        ResponseEntity<Map<String, String>> res = controller.recibirWebhookOnvo(
            "{\"type\":\"checkout-session.succeeded\",\"data\":{\"id\":\"sess_pos\"}}",
            "secret-onvo");

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        verify(onvoPaymentProvider, never()).procesarPagoExitoso(any(), any(), any());
    }

    @Test
    @DisplayName("Payment intent POS no dispara checkout de tienda")
    void paymentIntentPosQrNoPasaPorTienda() {
        when(posQrVentaService.completarSiPagoPasarela("pi_pos")).thenReturn(true);

        ResponseEntity<Map<String, String>> res = controller.recibirWebhookOnvo(
            "{\"type\":\"payment-intent.succeeded\",\"data\":{\"id\":\"pi_pos\"}}",
            "secret-onvo");

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        verify(onvoPaymentProvider, never()).procesarPagoExitoso(any(), any(), any());
    }

    @Test
    @DisplayName("Pago de tienda sigue el flujo ONVO normal")
    void pagoTiendaSiNoEsPosQr() {
        when(posQrVentaService.completarSiPagoPasarela("sess_tienda")).thenReturn(false);

        ResponseEntity<Map<String, String>> res = controller.recibirWebhookOnvo(
            "{\"type\":\"checkout-session.succeeded\",\"data\":{\"id\":\"sess_tienda\"}}",
            "secret-onvo");

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        verify(onvoPaymentProvider).procesarPagoExitoso(eq("sess_tienda"), any(), eq("webhook"));
    }
}
