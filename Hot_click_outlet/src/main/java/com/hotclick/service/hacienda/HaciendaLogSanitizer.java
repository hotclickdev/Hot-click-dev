package com.hotclick.service.hacienda;

import java.util.regex.Pattern;

/**
 * Sanitiza lo que va a logs y a mensajes de error del flujo Hacienda: la clave numérica (50 dígitos)
 * lleva la cédula del emisor, y los mensajes de excepciones externas (Hacienda, XSD, red) pueden traer
 * claves, cédulas o fragmentos del XML.
 */
public final class HaciendaLogSanitizer {

    private static final Pattern DIGITOS_LARGOS = Pattern.compile("\\d{9,}");
    private static final Pattern CONTROL = Pattern.compile("[\\r\\n\\t\\p{Cntrl}]+");
    static final int MAX = 500;

    private HaciendaLogSanitizer() {}

    /** Deja solo los últimos 4 dígitos: "***1234". */
    public static String clave(String clave) {
        if (clave == null || clave.isBlank()) return "***";
        String c = clave.strip();
        return c.length() <= 4 ? "***" : "***" + c.substring(c.length() - 4);
    }

    /** Quita secuencias numéricas largas (claves, cédulas, consecutivos), saltos de línea y trunca. */
    public static String mensaje(String texto) {
        if (texto == null || texto.isBlank()) return "sin detalle";
        String s = CONTROL.matcher(texto).replaceAll(" ");
        s = DIGITOS_LARGOS.matcher(s).replaceAll("[num]").strip();
        return s.length() > MAX ? s.substring(0, MAX) + "…" : s;
    }

    /** Tipo de la excepción + mensaje sanitizado; nunca el getMessage() crudo. */
    public static String error(Throwable e) {
        if (e == null) return "sin detalle";
        return e.getClass().getSimpleName() + ": " + mensaje(e.getMessage());
    }
}
