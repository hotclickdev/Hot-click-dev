package com.hotclick.service.extraccion;

/** Utilidades de texto compartidas por los extractores de detalle de producto. */
final class ExtraccionDetalleTextUtils {

    static final String USER_AGENT_DESKTOP =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

    private ExtraccionDetalleTextUtils() {}

    /** Detecta URLs de páginas de resultados de búsqueda (no páginas de producto). */
    static boolean esPaginaDeResultados(String url) {
        if (url == null) return true;
        String lower = url.toLowerCase();
        return lower.contains("/s?") || lower.contains("/search") || lower.contains("?q=") ||
               lower.contains("?k=") || lower.contains("?st=") || lower.contains("_nkw=") ||
               lower.contains("/pl?") || lower.contains("?d=") || lower.contains("/sch/");
    }

    /** Filtra texto genérico de ecommerce que no describe el producto. */
    static String limpiarDescripcion(String desc) {
        if (desc == null || desc.isBlank()) return null;
        String lower = desc.toLowerCase();
        if (lower.startsWith("search ") || lower.startsWith("shop ") ||
            lower.contains("fast shipping") || lower.contains("free returns") ||
            lower.contains("top-rated customer") || lower.contains("great prices") ||
            lower.contains("find the best") || lower.contains("browse our") ||
            desc.length() < 20) {
            return null;
        }
        return desc;
    }

    static String truncar(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
