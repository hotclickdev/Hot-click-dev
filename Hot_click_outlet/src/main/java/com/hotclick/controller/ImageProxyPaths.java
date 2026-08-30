package com.hotclick.controller;

import java.net.URI;

/**
 * Path relativo permitido para el proxy de imágenes S3.
 * Rechaza traversal, schemes y query/fragment que podrían redirigir el fetch.
 */
public final class ImageProxyPaths {

    private ImageProxyPaths() {}

    public static boolean esSeguro(String p) {
        if (p == null || p.isBlank()) return false;
        if (p.contains("..") || p.startsWith("/") || p.startsWith("\\")) return false;
        if (p.contains("://") || p.contains("?") || p.contains("#") || p.contains("@")) return false;
        if (p.indexOf(':') >= 0 || p.indexOf('\\') >= 0) return false;
        return true;
    }

    public static boolean hostPermitido(String imageUrl, String s3PublicUrl) {
        try {
            String fetchedHost = URI.create(imageUrl).getHost();
            String allowedHost = URI.create(s3PublicUrl).getHost();
            return fetchedHost != null && fetchedHost.equalsIgnoreCase(allowedHost);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
