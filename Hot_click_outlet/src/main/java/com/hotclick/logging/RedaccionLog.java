package com.hotclick.logging;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * LOG-1: última barrera antes de escribir un log. Tapa IBAN, cédulas, URLs de onboarding y secretos aunque
 * un log.info los pase por error. No reemplaza no loguearlos: el código sigue sin pasarlos.
 */
public final class RedaccionLog {

    private RedaccionLog() {}

    private static final Pattern IBAN = Pattern.compile("\\bCR\\d{2}(?:[ -]?\\d{4}){4}[ -]?\\d{2}\\b", Pattern.CASE_INSENSITIVE);
    /** Física 1-2345-6789, jurídica 3-101-123456, o 9 a 12 dígitos seguidos (física, jurídica, DIMEX). */
    private static final Pattern CEDULA = Pattern.compile("(?<![\\w-])(?:\\d-\\d{3,4}-\\d{4,6}|\\d{9,12})(?![\\w-])");
    private static final Pattern ONBOARDING = Pattern.compile(
        "(?i)(onboarding_?url\\s*[=:]\\s*)\\S+|https?://\\S*onboarding\\S*");
    private static final Pattern SECRETO_CLAVE = Pattern.compile(
        "(?i)\\b(token|secret|password|passwd|clave|api[_-]?key|authorization|passphrase)(\\s*[=:]\\s*)(\"?)[^\\s,;\"]+");
    private static final Pattern BEARER = Pattern.compile("(?i)\\bBearer\\s+[A-Za-z0-9._~+/=-]+");
    private static final Pattern LLAVES = Pattern.compile("\\b(?:SG\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}|sk_(?:live|test)_[A-Za-z0-9]{8,}|whsec_[A-Za-z0-9]{8,})\\b");

    public static String enmascarar(String texto) {
        if (texto == null || texto.isEmpty()) return texto;
        String s = IBAN.matcher(texto).replaceAll("[IBAN]");
        s = LLAVES.matcher(s).replaceAll("[SECRETO]");
        s = BEARER.matcher(s).replaceAll("Bearer [SECRETO]");
        Matcher m = ONBOARDING.matcher(s);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            m.appendReplacement(sb, Matcher.quoteReplacement(m.group(1) != null ? m.group(1) + "[URL]" : "[URL]"));
        }
        m.appendTail(sb);
        s = SECRETO_CLAVE.matcher(sb.toString()).replaceAll("$1$2$3[SECRETO]");
        return CEDULA.matcher(s).replaceAll("[CEDULA]");
    }
}
