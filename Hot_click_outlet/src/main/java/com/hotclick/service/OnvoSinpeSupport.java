package com.hotclick.service;

/**
 * Normaliza cédula y teléfono CR para el método SINPE Móvil de ONVO.
 */
public final class OnvoSinpeSupport {

    private OnvoSinpeSupport() {}

    public static String telefonoE164(String raw) {
        String digitos = soloDigitos(raw);
        if (digitos.startsWith("506") && digitos.length() == 11) {
            return "+" + digitos;
        }
        if (digitos.length() == 8) {
            return "+506" + digitos;
        }
        throw new IllegalArgumentException("El teléfono SINPE debe tener 8 dígitos");
    }

    public static String cedula(String raw) {
        String digitos = soloDigitos(raw);
        if (digitos.length() < 9) {
            throw new IllegalArgumentException("La cédula debe tener al menos 9 dígitos");
        }
        return digitos;
    }

    public static String nombre(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("El nombre es requerido");
        }
        return raw.trim();
    }

    private static String soloDigitos(String raw) {
        return raw == null ? "" : raw.replaceAll("\\D", "");
    }
}
