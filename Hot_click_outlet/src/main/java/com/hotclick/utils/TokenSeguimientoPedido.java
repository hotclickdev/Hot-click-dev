package com.hotclick.utils;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.regex.Pattern;

/**
 * Token del enlace público de seguimiento de pedido (/seguimiento/{token}).
 * 32 bytes de {@link SecureRandom} en hexadecimal: no adivinable ni enumerable.
 */
public final class TokenSeguimientoPedido {

    private static final int BYTES = 32;
    private static final Pattern FORMATO = Pattern.compile("^[0-9a-f]{64}$");
    private static final SecureRandom RANDOM = new SecureRandom();

    private TokenSeguimientoPedido() {}

    public static String generar() {
        byte[] bytes = new byte[BYTES];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    /** Descarta de entrada cualquier valor que no pueda ser un token (evita consultas inútiles). */
    public static boolean formatoValido(String token) {
        return token != null && FORMATO.matcher(token).matches();
    }
}
