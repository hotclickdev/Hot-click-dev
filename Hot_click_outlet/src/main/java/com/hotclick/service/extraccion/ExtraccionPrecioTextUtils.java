package com.hotclick.service.extraccion;

import com.hotclick.service.ExtraccionService;

import java.util.List;

/** Utilidades compartidas por los extractores de precio. */
final class ExtraccionPrecioTextUtils {

    static final String USER_AGENT_DESKTOP =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

    private ExtraccionPrecioTextUtils() {}

    static Integer parsearPrecio(String texto) {
        try {
            String limpio = texto.replaceAll("[^0-9.,]", "").trim();
            if (limpio.isEmpty()) return null;
            // Normalizar: si tiene coma como decimal (12,99) → 12.99
            if (limpio.matches("\\d+,\\d{2}")) limpio = limpio.replace(",", ".");
            else limpio = limpio.replace(",", "");
            return (int) Double.parseDouble(limpio);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    static String extraerNombreFuente(String url) {
        try {
            String host = new java.net.URI(url).getHost();
            return host != null ? host.replaceFirst("^www\\.", "") : url;
        } catch (Exception e) {
            return url.length() > 50 ? url.substring(0, 50) : url;
        }
    }

    static int calcularPromedio(List<ExtraccionService.PrecioExtraido> precios) {
        return (int) precios.stream()
            .mapToInt(p -> p.precioCrc)
            .average()
            .orElse(0);
    }

    static boolean esUrlEcommerce(String url) {
        if (url == null) return false;
        String lower = url.toLowerCase();
        return lower.contains("amazon") || lower.contains("ebay") || lower.contains("walmart") ||
               lower.contains("tiendamia") || lower.contains("encuentra24") || lower.contains("crautos") ||
               lower.contains("linio") || lower.contains("alibaba") || lower.contains("aliexpress") ||
               lower.contains("mercadolibre") || lower.contains("bestbuy") || lower.contains("newegg");
    }
}
