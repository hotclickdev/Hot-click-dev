package com.hotclick.controller;
// QA LOCAL — NO COMMITEAR
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.service.OnvoService;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
@ExtendWith(MockitoExtension.class)
class QaLocalOnvoWebhookMalformadoTest {
    @Mock OnvoService onvoService; @Mock OnvoPaymentProvider provider;
    @Mock PosQrVentaService pos; @Mock OnvoBillingWebhookHandler billing;
    @Test void jsonMalformado_400_sinEfectos() {
        when(onvoService.getWebhookSecret()).thenReturn("webhook_secret_prueba");
        var c = new OnvoWebhookController(onvoService, provider, pos, billing, new ObjectMapper());
        for (String body : new String[]{"{\"type\":", "no-json", "{\"type\":\"payment-intent.succeeded\",\"data\":{\"id\":"}) {
            assertThat(c.recibirWebhookOnvo(body, "webhook_secret_prueba").getStatusCode().value()).isEqualTo(400);
        }
        verifyNoInteractions(provider, pos, billing);
    }
    @Test void jsonMalformado_conSecretInvalido_401_antesDeParsear() {
        when(onvoService.getWebhookSecret()).thenReturn("webhook_secret_prueba");
        var c = new OnvoWebhookController(onvoService, provider, pos, billing, new ObjectMapper());
        assertThat(c.recibirWebhookOnvo("{roto", "malo").getStatusCode().value()).isEqualTo(401);
        verifyNoInteractions(provider, pos, billing);
    }
}
