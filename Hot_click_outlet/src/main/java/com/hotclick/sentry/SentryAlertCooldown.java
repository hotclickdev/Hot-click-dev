package com.hotclick.sentry;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Evita Telegram duplicado del mismo issue en 5 minutos.
 */
@Component
public class SentryAlertCooldown {

    static final long COOLDOWN_MS = 300_000L;

    private final ConcurrentHashMap<String, Long> lastAlertMs = new ConcurrentHashMap<>();

    public boolean isCoolingDown(String issueId) {
        if (issueId == null || issueId.isBlank()) {
            return false;
        }
        Long last = lastAlertMs.get(issueId);
        return last != null && System.currentTimeMillis() - last < COOLDOWN_MS;
    }

    public void mark(String issueId) {
        if (issueId == null || issueId.isBlank()) {
            return;
        }
        lastAlertMs.put(issueId, System.currentTimeMillis());
    }
}
