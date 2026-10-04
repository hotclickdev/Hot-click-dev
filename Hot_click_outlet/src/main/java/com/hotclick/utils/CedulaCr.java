package com.hotclick.utils;

/**
 * Cédula / DIMEX de Costa Rica: 9 a 12 dígitos (física, jurídica, DIMEX o NITE). La física de 9 no empieza en 0
 * y se rechaza un solo dígito repetido (p. ej. 111111111, que antes se aceptaba). Misma regla que
 * {@code frontend/src/utils/cedulaCr.ts}.
 */
public final class CedulaCr {

    public static final int MIN_DIGITOS = 9;
    public static final int MAX_DIGITOS = 12;

    private CedulaCr() {}

    public static String normalizarONulo(String cedula) {
        if (cedula == null || cedula.isBlank()) return null;
        String digits = cedula.replaceAll("[^0-9]", "");
        if (digits.length() < MIN_DIGITOS || digits.length() > MAX_DIGITOS) return null;
        if (digits.chars().distinct().count() == 1) return null;
        if (digits.length() == MIN_DIGITOS && digits.charAt(0) == '0') return null;
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
