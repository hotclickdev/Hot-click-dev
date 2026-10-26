package com.hotclick.utils;

/**
 * Teléfono/WhatsApp de soporte de HotClick. Nunca hardcodeado: viene de
 * {@code hotclick.soporte.telefono} (env {@code HOTCLICK_SOPORTE_TELEFONO}), sin default.
 * Vacío ⇒ los llamadores ocultan el enlace/texto.
 */
public final class SoporteTelefono {

    private SoporteTelefono() {}

    public static boolean configurado(String telefono) {
        return !digitos(telefono).isEmpty();
    }

    public static String digitos(String telefono) {
        return telefono == null ? "" : telefono.replaceAll("\\D", "");
    }

    /** URL wa.me con los dígitos del valor configurado; 8 dígitos (local CR) ⇒ antepone el código de país. */
    public static String waUrl(String telefono) {
        String d = digitosWa(telefono);
        return d.isEmpty() ? "" : "https://wa.me/" + d;
    }

    /** Dígitos para wa.me (8 dígitos locales ⇒ con código de país); "" si no está configurado. */
    public static String digitosWa(String telefono) {
        String d = digitos(telefono);
        return d.length() == 8 ? "506" + d : d;
    }

    /** Texto visible: el valor configurado, sin caracteres HTML peligrosos. */
    public static String texto(String telefono) {
        return telefono == null ? "" : telefono.trim().replaceAll("[^0-9+()\\- ]", "");
    }
}
