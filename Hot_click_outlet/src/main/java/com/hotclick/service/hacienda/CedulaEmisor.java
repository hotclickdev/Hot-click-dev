package com.hotclick.service.hacienda;

/**
 * Normaliza la cédula del emisor: quita guiones y espacios ("3-101-123456" → "3101123456") y exige
 * solo dígitos con un largo válido para Hacienda (física 9, jurídica/NITE 10, DIMEX 11 o 12).
 */
public final class CedulaEmisor {

    static final int MIN = 9;
    static final int MAX = 12;

    private CedulaEmisor() {}

    /** Devuelve la cédula normalizada o lanza HaciendaConfiguracionException sin incluir el valor. */
    public static String normalizar(String cedula) {
        if (cedula == null || cedula.isBlank()) {
            throw new HaciendaConfiguracionException(
                "Falta la cédula jurídica de HotClick en la configuración fiscal; no se emitió el comprobante.");
        }
        String n = cedula.replaceAll("[\\s\\-]", "");
        if (!n.matches("\\d+") || n.length() < MIN || n.length() > MAX) {
            throw new HaciendaConfiguracionException(
                "La cédula del emisor no es válida (solo dígitos, 9 a 12); no se emitió el comprobante.");
        }
        return n;
    }
}
