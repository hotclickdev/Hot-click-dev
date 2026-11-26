package com.hotclick.security.config;

import org.springframework.security.web.header.HeaderWriter;

/**
 * Headers de seguridad HTTP (CSP, HSTS, etc.).
 * Extraído bit-idéntico de SecurityConfig — no cambia comportamiento.
 * Sin Meta Pixel (sin publicidad): no hay píxel /tr ni hosts de Meta en img-src. Meta aparece solo en frame-src
 * (videos embebidos y popup del login), en script-src (SDK) y en connect-src (login de Meta, AG-23/AG-30).
 * ONVO: el SDK de suscripción (zoid) carga el script https://sdk.onvopay.com/sdk.js y renderiza
 * el iframe https://sdk.onvopay.com/sdk; las llamadas a la API ocurren dentro del iframe.
 */
final class SecurityHeadersWriter {

    /** Único origen que necesita el SDK embebido de ONVO (script + iframe). */
    static final String ONVO_SDK_ORIGIN = "https://sdk.onvopay.com";

    /**
     * SDK de Facebook (solo para Embedded Signup y Login for Business, AG-23/AG-30): script y las llamadas del
     * login. NO es el Meta Pixel: img-src sigue sin hosts de Meta y no se permite el píxel {@code /tr}.
     */
    static final String META_SDK_ORIGIN = "https://connect.facebook.net";
    static final String META_CONEXION_CONNECT = "https://graph.facebook.com https://www.facebook.com";

    private SecurityHeadersWriter() {}

    /**
     * AG-14 H-08: el SDK de Facebook solo se permite en las rutas del panel del negocio ({@code /admin} y
     * {@code /plataforma}); el checkout, el enlace de compra y el catálogo no lo necesitan y no deben ofrecerlo como
     * gadget ante una inyección de HTML. La CSP viaja con el documento: una navegación interna del SPA desde otra
     * ruta conserva la CSP de la carga inicial, y el front recarga la página una vez si el SDK se bloquea.
     */
    static boolean esRutaDePanel(String uri) {
        if (uri == null) return false;
        return uri.equals("/admin") || uri.startsWith("/admin/")
            || uri.equals("/plataforma") || uri.startsWith("/plataforma/");
    }

    static HeaderWriter create(String s3PublicUrl) {
        return (req, res) -> {
            res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
            res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
            res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
            boolean panel = esRutaDePanel(req.getRequestURI());
            String metaScript = panel ? META_SDK_ORIGIN + " " : "";
            String metaConnect = panel ? META_CONEXION_CONNECT + " " : "";
            res.setHeader("Content-Security-Policy",
                "default-src 'self'; " +
                "script-src 'self' " + metaScript + ONVO_SDK_ORIGIN + " https://*.clerk.accounts.dev https://clerk.hotclick.lat https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://scripts.clarity.ms; " +
                "script-src-elem 'self' " + metaScript + ONVO_SDK_ORIGIN + " https://*.clerk.accounts.dev https://clerk.hotclick.lat https://www.googletagmanager.com https://www.google-analytics.com https://us-assets.i.posthog.com https://www.clarity.ms https://scripts.clarity.ms; " +
                "worker-src blob: 'self'; " +
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                "font-src 'self' https://fonts.gstatic.com; " +
                "img-src 'self' data: blob: " + s3PublicUrl + " https://*.amazonaws.com https://images.unsplash.com https://loremflickr.com https://*.googleusercontent.com https://img.clerk.com https://avatars.githubusercontent.com https://cdnjs.cloudflare.com https://i.ytimg.com https://tile.openstreetmap.org; " +
                "connect-src 'self' " + metaConnect + s3PublicUrl + " https://*.amazonaws.com https://*.clerk.accounts.dev https://clerk.hotclick.lat https://api.clerk.com https://clerk-telemetry.com https://www.google-analytics.com https://region1.google-analytics.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.us.sentry.io https://*.clarity.ms https://c.bing.com https://nominatim.openstreetmap.org; " +
                "frame-src " + ONVO_SDK_ORIGIN + " https://www.youtube.com https://www.youtube-nocookie.com https://www.tiktok.com https://www.instagram.com https://*.clerk.accounts.dev https://clerk.hotclick.lat https://www.facebook.com https://www.openstreetmap.org; " +
                "frame-ancestors 'self'; " +
                "object-src 'none'; " +
                "base-uri 'self';"
            );
        };
    }
}
