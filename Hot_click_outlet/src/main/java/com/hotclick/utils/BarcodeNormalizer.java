package com.hotclick.utils;

/**
 * Reglas alineadas con {@code barcodeHid.ts} en el frontend: trim y mínimo 4 caracteres.
 */
public final class BarcodeNormalizer {

    private static final int MIN_LENGTH = 4;

    private BarcodeNormalizer() {}

    /** {@code trim()}; null si vacío o longitud &lt; 4. */
    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String codigo = raw.trim();
        if (codigo.isEmpty() || codigo.length() < MIN_LENGTH) {
            return null;
        }
        return codigo;
    }
}
