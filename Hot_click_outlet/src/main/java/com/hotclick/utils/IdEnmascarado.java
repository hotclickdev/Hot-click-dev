package com.hotclick.utils;

/**
 * QA5 BAJO: ids de ONVO (checkout session, payment intent) para logs sin exponerlos completos.
 * Deja el prefijo de tipo ("cs_", "pi_") y los últimos 4 caracteres: alcanza para correlacionar con el panel de ONVO
 * sin que el log sirva para consultar o reusar la sesión.
 */
public final class IdEnmascarado {
    private IdEnmascarado() {}

    private static final int VISIBLES = 4;

    public static String de(String id) {
        if (id == null || id.isBlank()) return "?";
        String v = id.trim();
        int guion = v.indexOf('_');
        String prefijo = guion > 0 && guion <= 8 ? v.substring(0, guion + 1) : "";
        String resto = v.substring(prefijo.length());
        if (resto.length() <= VISIBLES * 2) return prefijo + "****";
        return prefijo + "…" + resto.substring(resto.length() - VISIBLES);
    }
}
