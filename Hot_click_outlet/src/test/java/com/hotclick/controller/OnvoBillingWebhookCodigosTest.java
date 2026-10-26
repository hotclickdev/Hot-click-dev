package com.hotclick.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.service.OnvoService;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler.Resultado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.web.client.ResourceAccessException;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Códigos del webhook de billing ONVO: ONVO solo cuenta 2xx como entregado. */
@ExtendWith(MockitoExtension.class)
@DisplayName("Webhook billing ONVO: códigos de respuesta")
class OnvoBillingWebhookCodigosTest {

    private static final String SECRET = "secreto-de-prueba-billing";
    private static final String EVENTO = "{\"id\":\"evt_b\",\"type\":\"subscription.renewal.failed\",\"data\":{\"id\":\"sub_b\"}}";

    @Mock OnvoService onvoService;
    @Mock OnvoPaymentProvider onvoPaymentProvider;
    @Mock PosQrVentaService posQrVentaService;
    @Mock OnvoBillingWebhookHandler billing;
    private OnvoWebhookController controller;

    @BeforeEach
    void armar() {
        controller = new OnvoWebhookController(onvoService, onvoPaymentProvider, posQrVentaService, billing, new ObjectMapper());
        lenient().when(onvoService.getWebhookSecret()).thenReturn(SECRET);
    }

    private int estado(String body, String secret) {
        return controller.recibirWebhookOnvo(body, secret).getStatusCode().value();
    }

    @Test @DisplayName("Secreto ausente → 401 sin procesar")
    void secretoAusente() {
        assertThat(estado(EVENTO, null)).isEqualTo(401);
        verify(billing, never()).procesar(any(), any(), any());
    }

    @Test @DisplayName("Secreto inválido → 401 sin procesar")
    void secretoInvalido() {
        assertThat(estado(EVENTO, SECRET + "x")).isEqualTo(401);
        verify(billing, never()).procesar(any(), any(), any());
    }

    @Test @DisplayName("Secreto se compara en tiempo constante (MessageDigest.isEqual)")
    void comparacionTiempoConstante() throws Exception {
        String src = Files.readString(Path.of("src/main/java/com/hotclick/controller/OnvoWebhookController.java"));
        assertThat(src).contains("MessageDigest.isEqual(");
    }

    @Test @DisplayName("Evento rechazado (inválido o de otro modo) → 200, no 500")
    void rechazado() {
        when(billing.procesar(any(), any(), any())).thenReturn(Resultado.RECHAZADO);
        assertThat(estado(EVENTO, SECRET)).isEqualTo(200);
    }

    @Test @DisplayName("Evento duplicado → 200")
    void duplicado() {
        when(billing.procesar(any(), any(), any())).thenReturn(Resultado.DUPLICADO);
        assertThat(estado(EVENTO, SECRET)).isEqualTo(200);
    }

    @Test @DisplayName("Evento desconocido (ni billing ni tienda) → 200")
    void desconocido() {
        when(billing.procesar(any(), any(), any())).thenReturn(Resultado.NO_BILLING);
        assertThat(estado("{\"type\":\"algo.raro\",\"data\":{}}", SECRET)).isEqualTo(200);
    }

    @Test @DisplayName("Payload ilegible con secreto válido → 200 auditado")
    void payloadInvalido() {
        assertThat(estado("{no-json", SECRET)).isEqualTo(200);
        verify(billing, never()).procesar(any(), any(), any());
    }

    @Test @DisplayName("Fallo de BD propio → 503 para que ONVO reintente")
    void falloBd() {
        when(billing.procesar(any(), any(), any())).thenThrow(new DataAccessResourceFailureException("bd"));
        assertThat(estado(EVENTO, SECRET)).isEqualTo(503);
    }

    @Test @DisplayName("Timeout del GET a ONVO → 503")
    void timeoutOnvo() {
        when(billing.procesar(any(), any(), any())).thenThrow(new ResourceAccessException("timeout"));
        assertThat(estado(EVENTO, SECRET)).isEqualTo(503);
    }
}
