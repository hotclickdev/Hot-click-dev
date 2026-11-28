package com.hotclick.service.fiscal;

import com.hotclick.utils.CedulaCr;

/**
 * Cédula del contribuyente por tipo: física de 9 dígitos (no empieza con 0), jurídica de 10 dígitos (empieza con 3)
 * o DIMEX de 11 o 12 dígitos. Solo dígitos, con guiones o espacios de formato.
 */
public final class CedulaFiscal {

    public static final String MENSAJE =
        "La cédula no es válida: física de 9 dígitos (no empieza con 0), jurídica de 10 (empieza con 3) o DIMEX de 11 o 12.";

    private CedulaFiscal() {}

    /** Dígitos de la cédula o null si el formato o el tipo no son válidos. */
    public static String normalizar(String valor) {
        String d = CedulaCr.realONulo(valor);
        if (d == null) return null;
        return switch (d.length()) {
            case 9 -> d.charAt(0) == '0' ? null : d;
            case 10 -> d.charAt(0) == '3' ? d : null;
            case 11, 12 -> d;
            default -> null;
        };
    }
}
