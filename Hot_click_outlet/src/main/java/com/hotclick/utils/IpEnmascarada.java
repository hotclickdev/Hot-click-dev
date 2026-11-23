package com.hotclick.utils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * La IP es dato personal: no va completa a logs, correos ni avisos de operación.
 * IPv4 "190.10.20.30" → "190.10.20.xxx"; IPv6 conserva solo los dos primeros grupos.
 */
public final class IpEnmascarada {

    private static final String OCTETO = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
    private static final Pattern IPV4 = Pattern.compile("(?<![\\d.])(" + OCTETO + "\\.){3}" + OCTETO + "(?![\\d.]*\\d)");
    private static final Pattern IPV6 = Pattern.compile("(?<![0-9A-Fa-f:])(?:[0-9A-Fa-f]{1,4}:){3,7}[0-9A-Fa-f]{1,4}(?![0-9A-Fa-f:])");

    private IpEnmascarada() {}

    /** Enmascara una IP suelta; vacío si viene null/en blanco; texto que no parece IP → "***". */
    public static String enmascarar(String ip) {
        if (ip == null || ip.isBlank()) return "";
        String t = ip.trim();
        if (IPV4.matcher(t).matches()) return mascaraV4(t);
        if (IPV6.matcher(t).matches()) return mascaraV6(t);
        return "***";
    }

    /** Enmascara cada IP que aparezca dentro de un texto libre (mensajes de alerta, detalles). */
    public static String enmascararEnTexto(String texto) {
        return reemplazar(texto, true);
    }

    /** Quita por completo cada IP de un texto libre ("[ip]"): para destinos externos como Sentry/Telegram. */
    public static String redactarEnTexto(String texto) {
        return reemplazar(texto, false);
    }

    private static String reemplazar(String texto, boolean enmascarar) {
        if (texto == null) return null;
        String r = reemplazarCon(IPV4, texto, enmascarar);
        return reemplazarCon(IPV6, r, enmascarar);
    }

    private static String reemplazarCon(Pattern p, String texto, boolean enmascarar) {
        Matcher m = p.matcher(texto);
        return m.replaceAll(res -> Matcher.quoteReplacement(
            enmascarar ? enmascarar(res.group()) : "[ip]"));
    }

    private static String mascaraV4(String ip) {
        return ip.substring(0, ip.lastIndexOf('.')) + ".xxx";
    }

    private static String mascaraV6(String ip) {
        String[] g = ip.split(":");
        return g[0] + ":" + g[1] + ":…";
    }
}
