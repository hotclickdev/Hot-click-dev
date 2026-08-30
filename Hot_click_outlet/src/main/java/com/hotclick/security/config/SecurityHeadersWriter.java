package com.hotclick.security.config;

import org.springframework.security.web.header.HeaderWriter;

/**
 * Headers de seguridad HTTP (CSP, HSTS, etc.).
 * Extraído bit-idéntico de SecurityConfig — no cambia comportamiento.
 */
final class SecurityHeadersWriter {

    private SecurityHeadersWriter() {}

    static HeaderWriter create(String s3PublicUrl) {
        return (req, res) -> {
            res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
            res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
            res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
            res.setHeader("Content-Security-Policy",
                "default-src 'self'; " +
                "script-src 'self' https://js.stripe.com https://*.clerk.accounts.dev https://clerk.hotclick.lat https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://scripts.clarity.ms; " +
                "script-src-elem 'self' https://js.stripe.com https://*.clerk.accounts.dev https://clerk.hotclick.lat https://www.googletagmanager.com https://www.google-analytics.com https://us-assets.i.posthog.com https://www.clarity.ms https://scripts.clarity.ms; " +
                "worker-src blob: 'self'; " +
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                "font-src 'self' https://fonts.gstatic.com; " +
                "img-src 'self' data: blob: " + s3PublicUrl + " https://*.amazonaws.com https://images.unsplash.com https://loremflickr.com https://*.googleusercontent.com https://img.clerk.com https://avatars.githubusercontent.com https://cdnjs.cloudflare.com; " +
                "connect-src 'self' " + s3PublicUrl + " https://*.amazonaws.com https://*.clerk.accounts.dev https://clerk.hotclick.lat https://api.clerk.com https://clerk-telemetry.com https://api.stripe.com https://hooks.stripe.com https://www.google-analytics.com https://region1.google-analytics.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.us.sentry.io https://*.clarity.ms https://c.bing.com; " +
                "frame-src https://js.stripe.com https://hooks.stripe.com https://www.youtube.com https://www.youtube-nocookie.com https://www.tiktok.com https://www.instagram.com https://*.clerk.accounts.dev https://clerk.hotclick.lat; " +
                "frame-ancestors 'self'; " +
                "object-src 'none'; " +
                "base-uri 'self';"
            );
        };
    }
}
