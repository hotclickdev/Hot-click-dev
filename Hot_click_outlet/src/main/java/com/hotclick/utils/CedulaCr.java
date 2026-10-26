package com.hotclick.utils;

/**
 * Cédula / DIMEX de Costa Rica: 9 a 12 dígitos (física, jurídica o DIMEX).
 */
public final class CedulaCr {

    public static final int MIN_DIGITOS = 9;
    public static final int MAX_DIGITOS = 12;

    private CedulaCr() {}

    public static String normalizarONulo(String cedula) {
        if (cedula == null || cedula.isBlank()) return null;
        String digits = cedula.replaceAll("[^0-9]", "");
        if (digits.length() < MIN_DIGITOS || digits.length() > MAX_DIGITOS) return null;
        return digits;
    }

    /**
     * #318: cédula real o nulo. Solo acepta dígitos con espacios/guiones de formato (1-1234-0567);
     * cualquier letra o prefijo interno (REG-, EMP-, GUEST-, CL…, SISTEMA-…) cuenta como "sin cédula".
     */
    public static String realONulo(String identificacion) {
        if (identificacion == null) return null;
        String t = identificacion.trim();
        if (!t.matches("[0-9][0-9 \\-]*")) return null;
        return normalizarONulo(t);
    }

    public static String requireValida(String cedula) {
        String digits = normalizarONulo(cedula);
        if (digits == null) {
            throw new IllegalArgumentException("Cédula inválida");
        }
        return digits;
    }
}
