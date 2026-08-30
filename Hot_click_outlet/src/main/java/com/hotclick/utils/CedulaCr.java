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

    public static String requireValida(String cedula) {
        String digits = normalizarONulo(cedula);
        if (digits == null) {
            throw new IllegalArgumentException("Cédula inválida");
        }
        return digits;
    }
}
