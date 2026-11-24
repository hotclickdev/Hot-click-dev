package com.hotclick.agente.enlace;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.regex.Pattern;

/** Código del enlace: 18 bytes de SecureRandom (144 bits) en base64url sin relleno = 24 caracteres. */
public final class CodigoEnlace {

    static final int BYTES = 18;
    static final int LARGO_MIN = 22;
    static final int LARGO_MAX = 64;
    private static final Pattern FORMATO = Pattern.compile("^[A-Za-z0-9_-]{" + LARGO_MIN + "," + LARGO_MAX + "}$");
    private static final SecureRandom RANDOM = new SecureRandom();

    private CodigoEnlace() { }

    public static String generar() {
        byte[] b = new byte[BYTES];
        RANDOM.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    /** Filtro barato antes de ir a la BD: cualquier cosa fuera del formato se trata igual que un código inexistente. */
    public static boolean formatoValido(String codigo) {
        return codigo != null && FORMATO.matcher(codigo).matches();
    }

    /** Para logs: nunca el código completo. */
    public static String paraLog(String codigo) {
        return codigo == null || codigo.length() < 6 ? "?" : codigo.substring(0, 4) + "…";
    }
}
