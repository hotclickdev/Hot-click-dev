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

    public static final String MENSAJE_PLAN = "En el plan Emprendedor el video tiene que ser de YouTube. Instagram y TikTok van desde el plan Pyme.";

    private static final Set<String> HOSTS_YOUTUBE = Set.of(
        "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com");

    /** LAN-4: true si la URL es de una red social (no YouTube). Vacío o inválido = false. */
    public static boolean esRedSocial(String url) {
        if (url == null || url.isBlank()) return false;
        try {
            String host = new URI(url.trim()).getHost();
            return host != null && !HOSTS_YOUTUBE.contains(host.toLowerCase(Locale.ROOT));
        } catch (Exception e) {
            return false;
        }
    }

    /** LAN-4: si el plan no permite contacto directo (Emprendedor), solo YouTube. */
    public static void exigirSegunPlan(String url, boolean permiteRedes) {
        exigir(url);
        if (!permiteRedes && esRedSocial(url)) throw new IllegalArgumentException(MENSAJE_PLAN);
    }

    public static void exigir(String url) {
        if (!esPermitida(url)) throw new IllegalArgumentException(MENSAJE);
    }
}
