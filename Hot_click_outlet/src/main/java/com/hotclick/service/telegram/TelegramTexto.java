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
    private static final Pattern TOKEN_EN_URL = Pattern.compile("bot\\d+:[A-Za-z0-9_-]+");
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
        return TOKEN_EN_URL.matcher(texto).replaceAll("bot***");
    }

    /** Telegram rechazó el formato (no el chat ni el token): se puede reenviar como texto plano. */
    public static boolean esErrorDeFormato(String cuerpoRespuesta) {
        return cuerpoRespuesta != null && cuerpoRespuesta.contains("can't parse entities");
    }
}
