package com.hotclick.service.telegram;

import java.util.regex.Pattern;

/**
 * Utilidades de texto para la API de Telegram.
 *
 * <ul>
 *   <li>{@link #escaparMarkdown(String)}: escapa un valor dinámico antes de meterlo en un mensaje con
 *       {@code parse_mode=Markdown} (legacy). Un {@code _} o {@code *} sin cerrar hace que Telegram
 *       responda 400 «can't parse entities» y el mensaje no llega.</li>
 *   <li>{@link #sinToken(String)}: quita el token del bot de cualquier texto que vaya al log. Los
 *       errores de {@code RestTemplate} incluyen la URL completa ({@code /bot<token>/sendMessage}).</li>
 * </ul>
 */
public final class TelegramTexto {

    /** {@code bot123456:AA...} en la URL de la API o de descarga de archivos. */
    private static final Pattern TOKEN_EN_URL =
        Pattern.compile("(?i)bot\\d+(?::|%(?:25)*3A)[A-Za-z0-9_-]+");
    /** C2: token sin prefijo (Auditor 8: también %253A y tokens cortos, desde 10 caracteres) {@code bot} (p. ej. en mensajes de configuración). */
    private static final Pattern TOKEN_SUELTO =
        Pattern.compile("(?i)\\d{6,}(?::|%(?:25)*3A)[A-Za-z0-9_-]{10,}");
    /** Caracteres con significado en Markdown legacy de Telegram. */
    private static final Pattern MARKDOWN = Pattern.compile("([_*`\\[])");

    private TelegramTexto() {
    }

    public static String escaparMarkdown(String valor) {
        if (valor == null || valor.isEmpty()) return valor == null ? "" : valor;
        return MARKDOWN.matcher(valor).replaceAll("\\\\$1");
    }

    public static String sinToken(String texto) {
        if (texto == null) return null;
        String sinUrl = TOKEN_EN_URL.matcher(texto).replaceAll("bot***");
        return TOKEN_SUELTO.matcher(sinUrl).replaceAll("***");
    }

    /** Largo máximo de un mensaje de excepción ajeno dentro de una línea de log. */
    public static final int MAX_MENSAJE_LOG = 120;

    /**
     * Un mensaje de excepción ajeno que va a una línea de log: sin token, sin saltos de línea
     * (no se puede inyectar líneas falsas) y truncado a {@value #MAX_MENSAJE_LOG} caracteres.
     */
    public static String paraLog(String texto) {
        if (texto == null) return null;
        String limpio = sinToken(texto).replaceAll("[\\r\\n\\t]+", " ");
        return limpio.length() <= MAX_MENSAJE_LOG ? limpio : limpio.substring(0, MAX_MENSAJE_LOG) + "…";
    }

    /** El chat_id no va completo a logs ni avisos: {@code ***NNNN} con los últimos 4 dígitos. */
    public static String chatEnmascarado(Long chatId) {
        if (chatId == null) return "***";
        String s = Long.toString(Math.abs(chatId));
        return "***" + (s.length() > 4 ? s.substring(s.length() - 4) : s);
    }

    /** Telegram rechazó el formato (no el chat ni el token): se puede reenviar como texto plano. */
    public static boolean esErrorDeFormato(String cuerpoRespuesta) {
        return cuerpoRespuesta != null && cuerpoRespuesta.contains("can't parse entities");
    }
}
