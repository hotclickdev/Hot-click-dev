package com.hotclick.service.telegram;

import java.text.Normalizer;
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
            + "|['\"]\\s*or\\s+(true|1)\\b"
            + "|drop\\s+table"
            + "|<script"
            + "|<[a-z][^>]*[\\s/]on\\w+\\s*="
            + "|xp_cmdshell",
        Pattern.CASE_INSENSITIVE);

    private static final Pattern COMENTARIO_SQL = Pattern.compile("/\\*.*?\\*/", Pattern.DOTALL);

    private TelegramTextoSospechoso() {}

    static boolean es(String texto) {
        if (texto == null || texto.isBlank()) return false;
        return PATRON.matcher(normalizar(texto)).find();
    }

    /**
     * Auditor 8: NFKC (ancho completo → ASCII) y comentarios SQL {@code /**}{@code /} → espacio,
     * para que {@code union/**}{@code /select} o {@code ＵＮＩＯＮ ＳＥＬＥＣＴ} no esquiven el patrón.
     */
    static String normalizar(String texto) {
        String n = Normalizer.normalize(texto, Normalizer.Form.NFKC);
        return COMENTARIO_SQL.matcher(n).replaceAll(" ");
    }
}
