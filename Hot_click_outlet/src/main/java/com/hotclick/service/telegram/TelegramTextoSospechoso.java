package com.hotclick.service.telegram;

/** Patrones claros de inyección. No marca texto normal de un negocio. */
final class TelegramTextoSospechoso {

    private TelegramTextoSospechoso() {}

    static boolean es(String texto) {
        if (texto == null || texto.isBlank()) return false;
        String t = texto.toLowerCase();
        return t.contains("union select")
            || t.contains("' or ")
            || t.contains("\" or ")
            || t.contains("drop table")
            || t.contains("<script")
            || t.contains("xp_cmdshell");
    }
}
