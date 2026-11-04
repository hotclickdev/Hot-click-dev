package com.hotclick.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.payment.OnvoPaymentProvider.Verificacion;
import com.hotclick.service.OnvoService;
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
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import com.hotclick.service.reembolso.ReembolsoOnvoService;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import com.hotclick.service.reembolso.ReembolsoOnvoService.WebhookResultado;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Webhook ONVO refund.*: secret verificado, relee el refund y es fail-closed")
class OnvoWebhookReembolsoTest {

    private static final String FIRMA_WEBHOOK = String.join("-", "firma", "webhook", "de", "prueba");
    private static final String REFUND = "{\"type\":\"refund.succeeded\",\"data\":{\"id\":\"rf_test_1\",\"status\":\"succeeded\"}}";

    @Mock OnvoService onvoService;
    @Mock OnvoPaymentProvider onvoPaymentProvider;
    @Mock PosQrVentaService posQrVentaService;
    @Mock OnvoBillingWebhookHandler billingWebhookHandler;
    @Mock ReembolsoOnvoService reembolso;

    private OnvoWebhookController controller;

    @BeforeEach
    void armar() {
        controller = new OnvoWebhookController(
            onvoService, onvoPaymentProvider, posQrVentaService, billingWebhookHandler, new ObjectMapper());
        controller.setReembolsoOnvoParaTest(reembolso);
        when(onvoService.getWebhookSecret()).thenReturn(FIRMA_WEBHOOK);
        when(billingWebhookHandler.manejarSiBilling(any(), any(), any())).thenReturn(false);
    }

    private int estado(String body, String secret) {
        return controller.recibirWebhookOnvo(body, secret).getStatusCode().value();
    }

    @Test
    @DisplayName("Secret inválido o ausente → 401 sin resolver nada")
    void secretInvalido() {
        assertThat(estado(REFUND, "otro")).isEqualTo(401);
        assertThat(estado(REFUND, null)).isEqualTo(401);
        verifyNoInteractions(reembolso);
    }

    @Test
    @DisplayName("Resuelto → 200; ya resuelto → 200 duplicate; solo con el id, no con el status del cuerpo")
    void resuelto() {
        when(reembolso.resolverPorWebhook("rf_test_1")).thenReturn(WebhookResultado.RESUELTO);
        assertThat(estado(REFUND, FIRMA_WEBHOOK)).isEqualTo(200);
        when(reembolso.resolverPorWebhook("rf_test_1")).thenReturn(WebhookResultado.YA_RESUELTO);
        assertThat(estado(REFUND, FIRMA_WEBHOOK)).isEqualTo(200);
        verify(reembolso, times(2)).resolverPorWebhook("rf_test_1");
    }

    @Test
    @DisplayName("Pending, desconocido, sin ONVO o error → no 2xx (ONVO reintenta)")
    void failClosed() {
        when(reembolso.resolverPorWebhook("rf_test_1")).thenReturn(WebhookResultado.PENDIENTE);
        assertThat(estado(REFUND, FIRMA_WEBHOOK)).isEqualTo(409);
        when(reembolso.resolverPorWebhook("rf_test_1")).thenReturn(WebhookResultado.NO_ENCONTRADO);
        assertThat(estado(REFUND, FIRMA_WEBHOOK)).isEqualTo(404);
        when(reembolso.resolverPorWebhook("rf_test_1")).thenReturn(WebhookResultado.NO_CONSULTABLE);
        assertThat(estado(REFUND, FIRMA_WEBHOOK)).isEqualTo(503);
        when(reembolso.resolverPorWebhook("rf_test_1")).thenThrow(new IllegalStateException("x"));
        assertThat(estado(REFUND, FIRMA_WEBHOOK)).isEqualTo(500);
    }

    @Test
    @DisplayName("Sin id → 400; sin servicio de reembolso → 503")
    void sinIdOSinServicio() {
        assertThat(estado("{\"type\":\"refund.failed\",\"data\":{}}", FIRMA_WEBHOOK)).isEqualTo(400);
        controller.setReembolsoOnvoParaTest(null);
        assertThat(estado(REFUND, FIRMA_WEBHOOK)).isEqualTo(503);
    }
}
