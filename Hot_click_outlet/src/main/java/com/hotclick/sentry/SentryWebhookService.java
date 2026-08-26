package com.hotclick.sentry;

import com.hotclick.service.IncidentRemediationService;
import com.hotclick.service.TelegramService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class SentryWebhookService {

    private static final Logger log = LoggerFactory.getLogger(SentryWebhookService.class);

    private final TelegramService telegramService;
    private final IncidentRemediationService remediationService;
    private final SentryAlertCooldown cooldown;

    public SentryWebhookService(TelegramService telegramService,
                                IncidentRemediationService remediationService,
                                SentryAlertCooldown cooldown) {
        this.telegramService = telegramService;
        this.remediationService = remediationService;
        this.cooldown = cooldown;
    }

    public void procesar(Map<String, Object> body) {
        SentryWebhookIssue issue = SentryWebhookIssue.from(body);
        SentryAlertDecision decision = SentryAlertPolicy.decidir(issue);
        if (decision == SentryAlertDecision.SKIP) {
            log.info("Webhook Sentry omitido: action={} nivel={} env={}",
                    issue.action(), issue.nivel(), issue.environment());
            return;
        }
        if (cooldown.isCoolingDown(issue.issueId())) {
            log.info("Webhook Sentry en cooldown issueId={}", issue.issueId());
            return;
        }
        cooldown.mark(issue.issueId());
        telegramService.enviar(issue.mensajeTelegram());
        if (decision == SentryAlertDecision.TELEGRAM_Y_REMEDIAR) {
            remediationService.remediar(
                    issue.titulo(), issue.nivel(), issue.culprit(), issue.url(), issue.stackTrace());
        }
        log.info("Webhook Sentry: action={} nivel={} titulo={}", issue.action(), issue.nivel(), issue.titulo());
    }
}
