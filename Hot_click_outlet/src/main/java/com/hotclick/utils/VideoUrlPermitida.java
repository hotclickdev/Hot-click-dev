package com.hotclick.utils;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

/**
 * ESC-4: el video de un producto solo puede ser de YouTube, Instagram o TikTok (https).
 * Vacío = sin video. Cualquier otro dominio se rechaza con 400.
 */
public final class VideoUrlPermitida {

    public static final String MENSAJE = "El video tiene que ser un enlace de YouTube, Instagram o TikTok";

    private static final Set<String> HOSTS = Set.of(
        "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com",
        "instagram.com", "www.instagram.com",
        "tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com");

    private VideoUrlPermitida() {}

    public static boolean esPermitida(String url) {
        if (url == null || url.isBlank()) return true;
        try {
            URI uri = new URI(url.trim());
            String host = uri.getHost();
            return "https".equalsIgnoreCase(uri.getScheme()) && host != null
                && uri.getUserInfo() == null && uri.getPort() == -1
                && HOSTS.contains(host.toLowerCase(Locale.ROOT));
        } catch (Exception e) {
            return false;
        }
    }

    public static void exigir(String url) {
        if (!esPermitida(url)) throw new IllegalArgumentException(MENSAJE);
    }
}
