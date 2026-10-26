package com.hotclick.controller;

import com.hotclick.sentry.SentryWebhookService;
import com.hotclick.service.TelegramService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Parameter;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** H-02: secret de webhooks por header, comparado en tiempo constante, fail-closed. */
@DisplayName("[H-02] Webhooks uptime/sentry: secret por header")
class WebhookControllerSecretHeaderTest {

    private static final String SECRETO = "valor-de-prueba-uptime";

    private final TelegramService telegram = mock(TelegramService.class);
    private final SentryWebhookService sentry = mock(SentryWebhookService.class);

    private WebhookController controller(String uptime, String sentrySecret) {
        return new WebhookController(telegram, sentry, uptime, sentrySecret);
    }

    @Test
    void uptime_secretCorrecto_200() {
        var r = controller(SECRETO, "").recibirWebhookUptime(SECRETO, "m", "u", "1", null);
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        verify(telegram).enviar(anyString());
    }

    @Test
    void uptime_secretIncorrectoONulo_401() {
        var c = controller(SECRETO, "");
        assertThat(c.recibirWebhookUptime("otro", null, null, "1", null).getStatusCode().value()).isEqualTo(401);
        assertThat(c.recibirWebhookUptime(null, null, null, "1", null).getStatusCode().value()).isEqualTo(401);
        assertThat(c.recibirWebhookUptime(SECRETO + "x", null, null, "1", null).getStatusCode().value()).isEqualTo(401);
        verifyNoInteractions(telegram);
    }

    @Test
    void secretNoConfigurado_siempre401() {
        var c = controller("", "");
        assertThat(c.recibirWebhookUptime("", null, null, "1", null).getStatusCode().value()).isEqualTo(401);
        assertThat(c.recibirWebhookSentry("", Map.of()).getStatusCode().value()).isEqualTo(401);
        verifyNoInteractions(telegram, sentry);
    }

    @Test
    void sentry_secretCorrecto_procesa() {
        var c = controller("", "s3ntry-prueba");
        assertThat(c.recibirWebhookSentry("s3ntry-prueba", Map.of()).getStatusCode().value()).isEqualTo(200);
        assertThat(c.recibirWebhookSentry("mal", Map.of()).getStatusCode().value()).isEqualTo(401);
        verify(sentry, times(1)).procesar(any());
    }

    @Test
    @DisplayName("El secret ya no se acepta por query string: el parámetro es @RequestHeader")
    void secretEsHeader() throws Exception {
        for (String metodo : new String[]{"recibirWebhookUptime", "recibirWebhookSentry"}) {
            var m = java.util.Arrays.stream(WebhookController.class.getMethods())
                .filter(x -> x.getName().equals(metodo)).findFirst().orElseThrow();
            Parameter p = m.getParameters()[0];
            var h = p.getAnnotation(org.springframework.web.bind.annotation.RequestHeader.class);
            assertThat(h).as(metodo).isNotNull();
            assertThat(h.value()).isEqualTo(WebhookController.HEADER_SECRET);
            assertThat(p.getAnnotation(org.springframework.web.bind.annotation.RequestParam.class)).isNull();
        }
    }
}
