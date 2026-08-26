package com.hotclick.sentry;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Webhook Sentry — payload y política de alerta")
class WebhookSentryPayloadTest {

    @Test
    @DisplayName("created + error en production → Telegram, sin remediación")
    void createdErrorProduction_telegram() {
        SentryWebhookIssue issue = SentryWebhookIssue.from(issueBody("created", "error", "production", "123"));
        assertThat(SentryAlertPolicy.decidir(issue)).isEqualTo(SentryAlertDecision.TELEGRAM);
        assertThat(issue.mensajeTelegram()).contains("NullPointerException");
    }

    @Test
    @DisplayName("created + fatal → Telegram y remediación")
    void createdFatal_remediar() {
        SentryWebhookIssue issue = SentryWebhookIssue.from(issueBody("created", "fatal", "production", "9"));
        assertThat(SentryAlertPolicy.decidir(issue)).isEqualTo(SentryAlertDecision.TELEGRAM_Y_REMEDIAR);
    }

    @Test
    @DisplayName("warning no alerta")
    void warning_skip() {
        SentryWebhookIssue issue = SentryWebhookIssue.from(issueBody("created", "warning", "production", "1"));
        assertThat(SentryAlertPolicy.decidir(issue)).isEqualTo(SentryAlertDecision.SKIP);
    }

    @Test
    @DisplayName("resolved no alerta")
    void resolved_skip() {
        SentryWebhookIssue issue = SentryWebhookIssue.from(issueBody("resolved", "error", "production", "1"));
        assertThat(SentryAlertPolicy.decidir(issue)).isEqualTo(SentryAlertDecision.SKIP);
    }

    @Test
    @DisplayName("error en staging no alerta")
    void staging_skip() {
        SentryWebhookIssue issue = SentryWebhookIssue.from(issueBody("created", "error", "staging", "1"));
        assertThat(SentryAlertPolicy.decidir(issue)).isEqualTo(SentryAlertDecision.SKIP);
    }

    @Test
    @DisplayName("environment en tags tipo tupla")
    void environmentDesdeTags() {
        Map<String, Object> body = Map.of(
                "action", "created",
                "data", Map.of("issue", Map.of(
                        "id", "44",
                        "title", "boom",
                        "level", "error",
                        "tags", List.of(List.of("environment", "production")))));
        SentryWebhookIssue issue = SentryWebhookIssue.from(body);
        assertThat(issue.esProduccion()).isTrue();
        assertThat(SentryAlertPolicy.decidir(issue)).isEqualTo(SentryAlertDecision.TELEGRAM);
    }

    @Test
    @DisplayName("triggered (metric alert) + error → Telegram")
    void triggered_telegram() {
        SentryWebhookIssue issue = SentryWebhookIssue.from(issueBody("triggered", "error", "production", "7"));
        assertThat(SentryAlertPolicy.decidir(issue)).isEqualTo(SentryAlertDecision.TELEGRAM);
    }

    private static Map<String, Object> issueBody(String action, String level, String environment, String id) {
        return Map.of(
                "action", action,
                "data", Map.of("issue", Map.of(
                        "id", id,
                        "title", "NullPointerException",
                        "level", level,
                        "permalink", "https://hotclick.sentry.io/issues/" + id,
                        "culprit", "com.hotclick.service.PedidoService",
                        "environment", environment,
                        "metadata", Map.of("value", "x was null"))));
    }
}
