package com.hotclick.sentry;

/**
 * Qué hacer con un webhook de Sentry. Solo production + error/fatal + issue nuevo.
 */
public final class SentryAlertPolicy {

    private SentryAlertPolicy() {}

    public static SentryAlertDecision decidir(SentryWebhookIssue issue) {
        if (issue == null || !issue.esAccionDeAlerta()) {
            return SentryAlertDecision.SKIP;
        }
        if (!issue.esProduccion() || !issue.esErrorOFatal()) {
            return SentryAlertDecision.SKIP;
        }
        return issue.esFatal()
                ? SentryAlertDecision.TELEGRAM_Y_REMEDIAR
                : SentryAlertDecision.TELEGRAM;
    }
}
