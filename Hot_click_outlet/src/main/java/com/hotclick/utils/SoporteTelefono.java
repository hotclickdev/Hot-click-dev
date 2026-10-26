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
        String d = digitos(telefono);
        if (d.isEmpty()) return "";
        if (d.length() == 8) d = "506" + d;
        return "https://wa.me/" + d;
    }

    /** Texto visible: el valor configurado, sin caracteres HTML peligrosos. */
    public static String texto(String telefono) {
        return telefono == null ? "" : telefono.trim().replaceAll("[^0-9+()\\- ]", "");
    }
}
