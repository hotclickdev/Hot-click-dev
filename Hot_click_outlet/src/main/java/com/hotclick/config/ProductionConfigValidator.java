package com.hotclick.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Validates critical security configuration at startup.
 *
 * In production (APP_URL starts with https:// and not localhost):
 *   - JWT_SECRET must be present and ≥ 64 chars
 *   - TOTP_ENCRYPTION_KEY must be set (otherwise TOTP secrets stored plaintext)
 *   - Logs CRITICAL for each missing setting (does NOT stop boot — avoids outage
 *     on first deploy before ops sets all vars)
 *
 * In development (localhost / http://):
 *   - Logs WARNINGs only.
 */
@Component
public class ProductionConfigValidator implements ApplicationListener<ApplicationStartedEvent> {

    private static final Logger log = LoggerFactory.getLogger(ProductionConfigValidator.class);

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${totp.encryption.key:}")
    private String totpEncryptionKey;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    @Value("${cors.allowed.origins:http://localhost:3000}")
    private String corsOrigins;

    @Override
    public void onApplicationEvent(@NonNull ApplicationStartedEvent event) {
        boolean isProduction = appUrl != null
            && appUrl.startsWith("https://")
            && !appUrl.contains("localhost");

        List<String> criticals = new ArrayList<>();
        List<String> warnings  = new ArrayList<>();

        // ── JWT secret strength ───────────────────────────────────────────────
        if (jwtSecret == null || jwtSecret.isBlank()) {
            criticals.add("JWT_SECRET env var is not set — JWT signing key is missing");
        } else if (jwtSecret.length() < 64) {
            String msg = "JWT_SECRET is only " + jwtSecret.length() +
                " chars — minimum 64 chars (512 bits) recommended for HS256";
            if (isProduction) criticals.add(msg);
            else              warnings.add(msg);
        }

        // ── TOTP encryption key ───────────────────────────────────────────────
        if (totpEncryptionKey == null || totpEncryptionKey.isBlank()) {
            String msg = "TOTP_ENCRYPTION_KEY is not set — TOTP secrets are stored in plaintext. " +
                "Generate with: openssl rand -hex 32";
            if (isProduction) criticals.add(msg);
            else              warnings.add(msg);
        } else if (totpEncryptionKey.length() != 64) {
            criticals.add("TOTP_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes for AES-256-GCM)");
        }

        // ── CORS sanity in production ─────────────────────────────────────────
        if (isProduction && corsOrigins != null && corsOrigins.contains("localhost")) {
            warnings.add("CORS_ALLOWED_ORIGINS contains 'localhost' in a production environment: " + corsOrigins);
        }

        // ── Log results ───────────────────────────────────────────────────────
        if (criticals.isEmpty() && warnings.isEmpty()) {
            log.info("[SECURITY CONFIG] All critical security settings are properly configured. env={}",
                isProduction ? "PRODUCTION" : "DEVELOPMENT");
            return;
        }

        for (String w : warnings) {
            log.warn("[SECURITY CONFIG] WARNING: {}", w);
        }
        for (String c : criticals) {
            log.error("[SECURITY CONFIG] CRITICAL: {}", c);
        }

        if (!criticals.isEmpty()) {
            log.error("[SECURITY CONFIG] {} critical security misconfiguration(s) detected in {} environment. " +
                "Resolve immediately.", criticals.size(), isProduction ? "PRODUCTION" : "DEVELOPMENT");
        }
    }
}
