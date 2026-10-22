package com.hotclick.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
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

    @Value("${cors.allowed.origins:}")
    private String corsOrigins;

    @Value("${webauthn.synthetic-id-key:}")
    private String webauthnSyntheticKey;

    @Value("${aws.s3.bucket:}")
    private String s3Bucket;

    // Perfiles efectivos (incluye spring.profiles.include, grupos y setAdditionalProfiles/setActiveProfiles).
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private Environment environment;

    // Retiro de Tilopay (plan-retiro-tilopay.md): borrar este campo y su chequeo junto con la integración.
    @Value("${tilopay.webhook-secret:}")
    private String tilopayWebhookSecret;

    @Override
    public void onApplicationEvent(@NonNull ApplicationStartedEvent event) {
        boolean isProduction = esProduccion(appUrl,
            environment == null ? "" : String.join(",", environment.getActiveProfiles()));

        List<String> criticals = new ArrayList<>();
        List<String> warnings  = new ArrayList<>();
        // Fatales: en prod abortan el arranque (fail-closed), no solo se loguean.
        List<String> fatales   = new ArrayList<>();

        // ── WebAuthn: clave de ids sintéticos (anti-enumeración) ──────────────
        String problemaWebauthn = com.hotclick.service.WebAuthnService.problemaClaveSintetica(webauthnSyntheticKey);
        if (problemaWebauthn != null) {
            criticals.add(problemaWebauthn);
            fatales.add(problemaWebauthn);
        }

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
        // Fail-closed: en prod no se arranca con orígenes vacíos, '*' ni localhost/127.0.0.1.
        String problemaCors = AllowedOrigins.problemaEnProduccion(corsOrigins);
        if (isProduction && problemaCors != null) {
            criticals.add(problemaCors + " en producción");
            fatales.add(problemaCors);
        }

        // ── Tilopay webhook secret (sin él, TilopayWebhookController rechaza todo) ──
        String problemaTilopay = problemaTilopayWebhookSecret(tilopayWebhookSecret);
        if (isProduction && problemaTilopay != null) {
            criticals.add(problemaTilopay);
            fatales.add(problemaTilopay);
        }

        // ── AWS Rekognition (moderación de imágenes) ──────────────────────────
        if (isProduction && (s3Bucket == null || s3Bucket.isBlank())) {
            criticals.add("AWS_S3_BUCKET no configurado — moderación de imágenes con Rekognition no funcionará");
        } else if (isProduction) {
            try {
                software.amazon.awssdk.auth.credentials.InstanceProfileCredentialsProvider provider =
                    software.amazon.awssdk.auth.credentials.InstanceProfileCredentialsProvider.create();
                provider.resolveCredentials();
                log.info("[SECURITY CONFIG] Instance Profile IAM credentials disponibles para Rekognition.");
            } catch (Exception e) {
                criticals.add("IAM Instance Profile no disponible — AWS Rekognition (moderación de imágenes) no funcionará. " +
                    "Verificar que la instancia EC2 tenga hotclick-ec2-role asignado y que incluya rekognition:DetectModerationLabels");
            }
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

        if (isProduction && !fatales.isEmpty()) {
            throw new IllegalStateException("[SECURITY CONFIG] Arranque abortado: " + String.join("; ", fatales));
        }
    }

    /**
     * Prod si cualquiera de las dos señales lo indica: app.url https no-localhost, o un perfil activo
     * "prod"/"production". Así un app.url mal puesto no apaga la validación en prod.
     */
    static boolean esProduccion(String appUrl, String perfiles) {
        boolean porUrl = esUrlProduccion(appUrl);
        boolean porPerfil = perfiles != null && java.util.Arrays.stream(perfiles.split(","))
            .map(p -> p.trim().toLowerCase(java.util.Locale.ROOT))
            .anyMatch(p -> p.equals("prod") || p.equals("production"));
        return porUrl || porPerfil;
    }

    /**
     * Fail-closed: toda URL que empieza con https:// (sin distinguir mayúsculas) es prod, salvo que el host
     * sea explícitamente localhost, *.localhost o 127.0.0.1. Si no se puede parsear o no tiene host, es prod.
     * Lo que no empieza con https:// (http://, vacío, basura) no es prod por URL; ahí decide el perfil.
     */
    static boolean esUrlProduccion(String appUrl) {
        if (appUrl == null) return false;
        String url = appUrl.trim();
        if (!url.toLowerCase(java.util.Locale.ROOT).startsWith("https://")) return false;
        String host;
        try {
            host = new java.net.URI(url).getHost();
        } catch (java.net.URISyntaxException e) {
            return true;
        }
        if (host == null || host.isEmpty()) return true;
        host = host.toLowerCase(java.util.Locale.ROOT);
        return !(host.equals("localhost") || host.endsWith(".localhost") || host.equals("127.0.0.1"));
    }

    static final int LARGO_MIN_TILOPAY_WEBHOOK_SECRET = 32;

    /** Problema con TILOPAY_WEBHOOK_SECRET (vacío o con menos de 32 caracteres), o null. Nunca incluye el valor. */
    static String problemaTilopayWebhookSecret(String secret) {
        if (secret == null || secret.isBlank()) return "TILOPAY_WEBHOOK_SECRET vacío o ausente";
        if (secret.trim().length() < LARGO_MIN_TILOPAY_WEBHOOK_SECRET) {
            return "TILOPAY_WEBHOOK_SECRET demasiado corto (mínimo " + LARGO_MIN_TILOPAY_WEBHOOK_SECRET + " caracteres)";
        }
        return null;
    }
}
