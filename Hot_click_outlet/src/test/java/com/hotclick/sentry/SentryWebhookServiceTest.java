package com.hotclick.sentry;

import com.hotclick.service.IncidentRemediationService;
import com.hotclick.service.TelegramService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("SentryWebhookService")
class SentryWebhookServiceTest {

    @Mock TelegramService telegramService;
    @Mock IncidentRemediationService remediationService;

    private final SentryAlertCooldown cooldown = new SentryAlertCooldown();

    private SentryWebhookService serviceConCooldown() {
        return new SentryWebhookService(telegramService, remediationService, cooldown);
    }

    @Test
    @DisplayName("created error envía Telegram y no remedia")
    void createdError_telegramSinRemediar() {
        serviceConCooldown().procesar(issue("created", "error", "88"));
        verify(telegramService).enviar(anyString());
        verify(remediationService, never()).remediar(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("created fatal remedia")
    void createdFatal_remedia() {
        serviceConCooldown().procesar(issue("created", "fatal", "89"));
        verify(telegramService).enviar(anyString());
        verify(remediationService).remediar(
                "NullPointerException", "FATAL", "com.hotclick.service.PedidoService",
                "https://hotclick.sentry.io/issues/89", "x was null");
    }

    @Test
    @DisplayName("warning no envía Telegram")
    void warning_noTelegram() {
        serviceConCooldown().procesar(issue("created", "warning", "90"));
        verify(telegramService, never()).enviar(anyString());
        verify(remediationService, never()).remediar(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("mismo issue en cooldown no vuelve a Telegram")
    void cooldown_omiteSegundo() {
        SentryWebhookService svc = serviceConCooldown();
        svc.procesar(issue("created", "error", "91"));
        svc.procesar(issue("created", "error", "91"));
        verify(telegramService).enviar(anyString());
    }

    private static Map<String, Object> issue(String action, String level, String id) {
        return Map.of(
                "action", action,
                "data", Map.of("issue", Map.of(
                        "id", id,
                        "title", "NullPointerException",
                        "level", level,
                        "permalink", "https://hotclick.sentry.io/issues/" + id,
                        "culprit", "com.hotclick.service.PedidoService",
                        "environment", "production",
                        "metadata", Map.of("value", "x was null"))));
    }
}
