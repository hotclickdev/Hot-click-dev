package com.hotclick.service.telegram;

import java.util.regex.Pattern;

/** Patrones claros de inyección. No marca texto normal de un negocio. */
final class TelegramTextoSospechoso {

    /**
     * TG3: antes bastaba {@code ' or } (falsos positivos con comillas en español, p. ej.
     * {@code "rojo" or azul}). Ahora exige la forma de tautología SQL: {@code ' or 1=1}, {@code ' or 'a'='a}.
     */
    private static final Pattern PATRON = Pattern.compile(
        "union\\s+(all\\s+)?select"
            + "|['\"]\\s*or\\s+['\"]?\\w+['\"]?\\s*=\\s*['\"]?\\w+"
            + "|drop\\s+table"
            + "|<script"
            + "|xp_cmdshell",
        Pattern.CASE_INSENSITIVE);

    private TelegramTextoSospechoso() {}

    static boolean es(String texto) {
        if (texto == null || texto.isBlank()) return false;
        return PATRON.matcher(texto).find();
    }
}
