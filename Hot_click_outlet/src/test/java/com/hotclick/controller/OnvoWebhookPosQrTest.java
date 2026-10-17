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
@SuppressWarnings({"unchecked", "rawtypes"})
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
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
        when(onvoService.obtenerCheckoutSession("sess_tienda")).thenReturn((Map) Map.of("status", "succeeded"));
        when(onvoPaymentProvider.procesarPagoVerificado(eq("sess_tienda"), any(), eq("webhook")))
            .thenReturn(OnvoPaymentProvider.Verificacion.OK);
        ResponseEntity<Map<String, String>> res = controller.recibirWebhookOnvo(
            "{\"type\":\"checkout-session.succeeded\",\"data\":{\"id\":\"sess_tienda\"}}",
            "secret-onvo");
        assertThat(res.getStatusCode().value()).isEqualTo(200);
        verify(posQrVentaService, never()).completarSiPagoPasarela(any());
        verify(onvoPaymentProvider).procesarPagoVerificado(eq("sess_tienda"), any(), eq("webhook"));
    }

    private ResponseEntity<Map<String, String>> sesion(OnvoPaymentProvider.Verificacion v) {
        when(onvoPaymentProvider.procesarPagoVerificado(eq("sess_x"), any(), eq("webhook"))).thenReturn(v);
        return controller.recibirWebhookOnvo(
            "{\"type\":\"checkout-session.succeeded\",\"data\":{\"id\":\"sess_x\",\"amount\":1}}", "secret-onvo");
    }

    @Test
    @DisplayName("WH-1: monto/moneda/empresa distintos o no pagado en ONVO → 400")
    void noVerificado400() {
        assertThat(sesion(OnvoPaymentProvider.Verificacion.DATOS_DISTINTOS).getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("WH-1: evento duplicado → 200 duplicate, sin reprocesar")
    void duplicado() {
        var res = sesion(OnvoPaymentProvider.Verificacion.DUPLICADO);
        assertThat(res.getStatusCode().value()).isEqualTo(200);
        assertThat(res.getBody()).containsEntry("status", "duplicate");
    }

    @Test
    @DisplayName("WH-1: cuerpo > 64 KB → 413 sin parsear; secreto inválido → 401")
    void tamanoYSecreto() {
        String grande = "{\"x\":\"" + "a".repeat(64 * 1024) + "\"}";
        assertThat(controller.recibirWebhookOnvo(grande, "secret-onvo").getStatusCode().value()).isEqualTo(413);
        assertThat(controller.recibirWebhookOnvo("{}", "malo").getStatusCode().value()).isEqualTo(401);
        verify(onvoPaymentProvider, never()).procesarPagoVerificado(any(), any(), any());
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
