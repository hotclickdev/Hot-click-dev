package com.hotclick.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.service.OnvoService;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.service.sinpe.SinpeOnvoMarketplaceService;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.Resultado.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** P-01: ruteo del webhook ONVO para el SINPE del marketplace. */
class OnvoWebhookSinpeMarketplaceTest {

    OnvoService onvo = mock(OnvoService.class);
    OnvoPaymentProvider provider = mock(OnvoPaymentProvider.class);
    PosQrVentaService pos = mock(PosQrVentaService.class);
    OnvoBillingWebhookHandler billing = mock(OnvoBillingWebhookHandler.class);
    SinpeOnvoMarketplaceService sinpe = mock(SinpeOnvoMarketplaceService.class);
    OnvoWebhookController c;

    @BeforeEach
    void armar() {
        c = new OnvoWebhookController(onvo, provider, pos, billing, new ObjectMapper());
        c.setSinpeMarketplaceParaTest(sinpe);
        when(onvo.getWebhookSecret()).thenReturn("whsec-prueba");
    }

    private int enviar(String type, String secret) {
        return c.recibirWebhookOnvo("{\"type\":\"" + type + "\",\"data\":{\"id\":\"pi_1\"}}", secret)
            .getStatusCode().value();
    }

    @Test
    @DisplayName("succeeded del marketplace: dedupe por tipo + data.id; confirmado/duplicado 200, no toca el POS")
    void succeeded() {
        when(sinpe.confirmarPorWebhook("payment-intent.succeeded", "pi_1")).thenReturn(CONFIRMADO, DUPLICADO);
        assertThat(enviar("payment-intent.succeeded", "whsec-prueba")).isEqualTo(200);
        assertThat(enviar("payment-intent.succeeded", "whsec-prueba")).isEqualTo(200);
        verify(pos, never()).confirmarSinpeOnvoPorWebhook(any(), any());
    }

    @Test
    @DisplayName("GET aún deferred/processing → 409 para que ONVO reintente; GET caído → 503")
    void esperaYTransitorio() {
        when(sinpe.confirmarPorWebhook(any(), any())).thenReturn(EN_ESPERA, NO_CONSULTABLE);
        assertThat(enviar("payment-intent.succeeded", "whsec-prueba")).isEqualTo(409);
        assertThat(enviar("payment-intent.succeeded", "whsec-prueba")).isEqualTo(503);
    }

    @Test
    @DisplayName("failed/deferred después de succeeded: 200 y no revierte ni libera stock")
    void fueraDeOrden() {
        when(sinpe.esDelMarketplace("pi_1")).thenReturn(true);
        assertThat(enviar("payment-intent.failed", "whsec-prueba")).isEqualTo(200);
        assertThat(enviar("payment-intent.deferred", "whsec-prueba")).isEqualTo(200);
        verify(provider, never()).registrarIntentFallido(any(), any());
        verify(sinpe, never()).confirmarPorWebhook(any(), any());
    }

    @Test
    @DisplayName("Secret faltante o distinto → 401 sin procesar")
    void secret() {
        assertThat(enviar("payment-intent.succeeded", null)).isEqualTo(401);
        assertThat(enviar("payment-intent.succeeded", "whsec-otro")).isEqualTo(401);
        verifyNoInteractions(sinpe);
    }

    @Test
    @DisplayName("Intent que no es del marketplace sigue al POS con clave tipo + data.id")
    void noEsMarketplace() {
        when(sinpe.confirmarPorWebhook(any(), any())).thenReturn(NO_ENCONTRADO);
        assertThat(enviar("payment-intent.succeeded", "whsec-prueba")).isEqualTo(200);
        verify(pos).confirmarSinpeOnvoPorWebhook("pi_1", "payment-intent.succeeded:pi_1");
    }
}
