package com.hotclick.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.service.OnvoService;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler.EventoBillingRechazado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Webhook ONVO | JSON malformado y respuesta HTTP según el resultado de billing")
class OnvoWebhookBillingNegativosTest {

    private static final String SECRET = "webhook_secret_prueba";
    private static final String RENOVACION = "{\"type\":\"subscription.renewal.succeeded\",\"data\":{\"id\":\"clinv0001\",\"subscriptionId\":\"clsub0001\"}}";

    @Mock OnvoService onvoService;
    @Mock OnvoPaymentProvider onvoPaymentProvider;
    @Mock PosQrVentaService posQrVentaService;
    @Mock OnvoBillingWebhookHandler billingWebhookHandler;

    private OnvoWebhookController controller;

    @BeforeEach
    void armar() {
        controller = new OnvoWebhookController(
            onvoService, onvoPaymentProvider, posQrVentaService, billingWebhookHandler, new ObjectMapper());
        when(onvoService.getWebhookSecret()).thenReturn(SECRET);
    }

    private int estado(String body) {
        return controller.recibirWebhookOnvo(body, SECRET).getStatusCode().value();
    }

    @Test
    @DisplayName("JSON malformado → 400 y no llega a billing ni a ningún proveedor")
    void jsonMalformado() {
        for (String body : new String[]{"{", "[1,", "{'type':'x'}", "no es json", "{\"type\":\"subscription.renewal.succeeded\",\"data\":"}) {
            assertThat(estado(body)).as(body).isEqualTo(400);
        }
        verifyNoInteractions(billingWebhookHandler, onvoPaymentProvider, posQrVentaService);
    }

    @Test
    @DisplayName("Rechazo permanente (el handler lo registra y devuelve true) → 200 scope billing, ONVO no reintenta")
    void rechazoPermanenteResponde200() {
        when(billingWebhookHandler.manejarSiBilling(any(), any(), any())).thenReturn(true);
        var resp = controller.recibirWebhookOnvo(RENOVACION, SECRET);
        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        assertThat(resp.getBody()).containsEntry("scope", "billing");
    }

    @Test
    @DisplayName("Rechazo transitorio o GET caído (el handler lanza) → 5xx para que ONVO reintente")
    void rechazoTransitorioResponde5xx() {
        when(billingWebhookHandler.manejarSiBilling(any(), any(), any()))
            .thenThrow(new EventoBillingRechazado("aún no pagado", "no_pagada"));
        assertThat(estado(RENOVACION)).isEqualTo(500);
        org.mockito.Mockito.doThrow(new IllegalStateException("onvo down")).when(billingWebhookHandler).manejarSiBilling(any(), any(), any());
        assertThat(estado(RENOVACION)).isEqualTo(500);
    }
}
