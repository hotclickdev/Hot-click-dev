package com.hotclick.security;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Enmascara secretos que viajan en la ruta antes de loguearla o guardarla en auditoría (QA-122-2):
 * el token del enlace de tienda rápida queda como sus primeros 4 caracteres + «…».
 */
public final class RutaLogSegura {

    private static final Pattern TOKEN_TIENDA_RAPIDA = Pattern.compile("(/tienda-rapida/)([^/?#]+)");
    private static final int VISIBLES = 4;

    private RutaLogSegura() {}

    public static String enmascarar(String ruta) {
        if (ruta == null) return null;
        Matcher m = TOKEN_TIENDA_RAPIDA.matcher(ruta);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String token = m.group(2);
            String visible = token.length() <= VISIBLES ? "" : token.substring(0, VISIBLES);
            m.appendReplacement(sb, Matcher.quoteReplacement(m.group(1) + visible + "…"));
        }
        m.appendTail(sb);
        return sb.toString();
    }
}
