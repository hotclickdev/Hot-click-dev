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

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Webhook ONVO | el cuerpo no confirma nada; solo dispara la reconsulta a ONVO")
class OnvoWebhookVerificadoTest {

    private static final String SESION_OK = "{\"type\":\"checkout-session.succeeded\",\"data\":{\"id\":\"cs_1\"}}";

    @Mock OnvoService onvoService;
    @Mock OnvoPaymentProvider onvoPaymentProvider;
    @Mock PosQrVentaService posQrVentaService;
    @Mock OnvoBillingWebhookHandler billingWebhookHandler;

    private OnvoWebhookController controller;

    @BeforeEach
    void armar() {
        controller = new OnvoWebhookController(
            onvoService, onvoPaymentProvider, posQrVentaService, billingWebhookHandler, new ObjectMapper());
        when(onvoService.getWebhookSecret()).thenReturn("webhook_secret_prueba");
        when(billingWebhookHandler.manejarSiBilling(any(), any(), any())).thenReturn(false);
    }

    private int estado(String body, String secret) {
        return controller.recibirWebhookOnvo(body, secret).getStatusCode().value();
    }

    @Test
    @DisplayName("Secret inválido o ausente → 401 y no se consulta ni confirma nada")
    void secretInvalido() {
        assertThat(estado(SESION_OK, "otro")).isEqualTo(401);
        assertThat(estado(SESION_OK, null)).isEqualTo(401);
        verifyNoInteractions(onvoPaymentProvider);
    }

    @Test
    @DisplayName("Sin secret configurado en el servidor → 401 siempre")
    void sinSecretConfigurado() {
        when(onvoService.getWebhookSecret()).thenReturn("");
        assertThat(estado(SESION_OK, "")).isEqualTo(401);
        verifyNoInteractions(onvoPaymentProvider);
    }

    @Test
    @DisplayName("Muchos intentos con secret inválido → 429; un secret válido igual pasa")
    void limiteSoloParaSecretInvalido() {
        for (int i = 0; i < OnvoWebhookController.MAX_SECRET_INVALIDO_POR_MINUTO; i++) {
            assertThat(estado(SESION_OK, "malo")).isEqualTo(401);
        }
        assertThat(estado(SESION_OK, "malo")).isEqualTo(429);

        when(onvoPaymentProvider.procesarPagoVerificado("cs_1", "webhook")).thenReturn(Verificacion.OK);
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(200);
    }

    @Test
    @DisplayName("Cuerpo de más de 64 KB → 413 sin procesar")
    void cuerpoGrande() {
        String grande = "{\"type\":\"x\",\"pad\":\"" + "a".repeat(OnvoWebhookController.MAX_BODY_BYTES) + "\"}";
        assertThat(estado(grande, "webhook_secret_prueba")).isEqualTo(413);
        verifyNoInteractions(onvoPaymentProvider);
    }

    @Test
    @DisplayName("checkout-session.succeeded: 200 solo si ONVO confirmó; si no, error para que ONVO reintente")
    void respuestaSegunVerificacion() {
        when(onvoPaymentProvider.procesarPagoVerificado("cs_1", "webhook")).thenReturn(Verificacion.OK);
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(200);

        when(onvoPaymentProvider.procesarPagoVerificado("cs_1", "webhook")).thenReturn(Verificacion.DUPLICADO);
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(200);

        when(onvoPaymentProvider.procesarPagoVerificado("cs_1", "webhook")).thenReturn(Verificacion.NO_PAGADO);
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(409);

        when(onvoPaymentProvider.procesarPagoVerificado("cs_1", "webhook")).thenReturn(Verificacion.DATOS_DISTINTOS);
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(409);

        when(onvoPaymentProvider.procesarPagoVerificado("cs_1", "webhook")).thenReturn(Verificacion.EN_PROCESO);
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(409);

        when(onvoPaymentProvider.procesarPagoVerificado("cs_1", "webhook")).thenReturn(Verificacion.COBRADO_SOBRE_CANCELADO);
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(200);

        when(onvoPaymentProvider.procesarPagoVerificado("cs_1", "webhook")).thenReturn(Verificacion.COBRADO_SOBREVENTA);
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(200);

        when(onvoPaymentProvider.procesarPagoVerificado("cs_1", "webhook")).thenReturn(Verificacion.NO_CONSULTABLE);
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(503);

        when(onvoPaymentProvider.procesarPagoVerificado("cs_1", "webhook")).thenReturn(Verificacion.NO_ENCONTRADO);
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(404);

        when(onvoPaymentProvider.procesarPagoVerificado("cs_1", "webhook")).thenThrow(new IllegalStateException("caído"));
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(500);
    }

    @Test
    @DisplayName("payment-intent.failed: solo se registra; nunca pasa por la confirmación")
    void intentFallido() {
        assertThat(estado("{\"type\":\"payment-intent.failed\",\"data\":{\"id\":\"pi_9\"}}",
            "webhook_secret_prueba")).isEqualTo(200);
        verify(onvoPaymentProvider).registrarIntentFallido("pi_9", "webhook");
        verify(onvoPaymentProvider, never()).procesarPagoVerificado(any(), any());

        assertThat(estado("{\"type\":\"payment-intent.failed\",\"data\":{}}", "webhook_secret_prueba")).isEqualTo(400);
    }

    @Test
    @DisplayName("payment-intent.succeeded solo no confirma pedidos (lo hace la sesión verificada)")
    void intentExitosoNoConfirma() {
        assertThat(estado("{\"type\":\"payment-intent.succeeded\",\"data\":{\"id\":\"pi_1\"}}",
            "webhook_secret_prueba")).isEqualTo(200);
        verify(onvoPaymentProvider, never()).procesarPagoVerificado(any(), any());
    }

    @Test
    @DisplayName("Caso 3 QA: llegan checkout-session.succeeded (x2) y payment-intent.succeeded → solo la sesión confirma; reentrega 200 duplicate")
    void dosEventosUnaConfirmacion() {
        when(onvoPaymentProvider.procesarPagoVerificado("cs_1", "webhook"))
            .thenReturn(Verificacion.OK, Verificacion.DUPLICADO);
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(200);
        assertThat(estado("{\"type\":\"payment-intent.succeeded\",\"data\":{\"id\":\"pi_1\"}}",
            "webhook_secret_prueba")).isEqualTo(200);
        assertThat(estado(SESION_OK, "webhook_secret_prueba")).isEqualTo(200);
        verify(onvoPaymentProvider, org.mockito.Mockito.times(2)).procesarPagoVerificado("cs_1", "webhook");
        verify(onvoPaymentProvider, never()).procesarPagoVerificado(org.mockito.ArgumentMatchers.eq("pi_1"), any());
    }

    @Test
    @DisplayName("INF-03: cada 401 por secret inválido se cuenta para la alerta; el secret válido no")
    void secretInvalidoCuentaParaAlerta() {
        var alerta = org.mockito.Mockito.mock(com.hotclick.monitoreo.OnvoWebhookSecretInvalidoAlerta.class);
        controller.setAlertaSecretInvalidoParaTest(alerta);
        assertThat(estado(SESION_OK, "otro")).isEqualTo(401);
        assertThat(estado(SESION_OK, null)).isEqualTo(401);
        verify(alerta, org.mockito.Mockito.times(2)).registrarFallo();
        estado(SESION_OK, "webhook_secret_prueba");
        verify(alerta, org.mockito.Mockito.times(2)).registrarFallo();
    }
}
