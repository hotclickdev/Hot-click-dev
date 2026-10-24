package com.hotclick.utils;

import java.util.regex.Pattern;

/**
 * Cédula para el registro de cuentas: física (9 dígitos), jurídica (10 dígitos, empieza en 3)
 * o DIMEX (11 o 12 dígitos). Se normaliza quitando guiones y espacios. Más estricta que
 * {@link CedulaCr}. Nunca registrar el valor en logs.
 */
public final class CedulaRegistro {

    public static final String MSG_INVALIDA = "Ingresá una cédula válida (física, jurídica o DIMEX)";

    private static final Pattern VALIDA = Pattern.compile("^(\\d{9}|3\\d{9}|\\d{11,12})$");

    private CedulaRegistro() {}

    /** Devuelve la cédula normalizada o lanza IllegalArgumentException con el mensaje público. */
    public static String normalizarOFallar(String valor) {
        if (valor == null) throw new IllegalArgumentException(MSG_INVALIDA);
        String n = valor.replaceAll("[\\s-]", "");
        if (!VALIDA.matcher(n).matches()) throw new IllegalArgumentException(MSG_INVALIDA);
        return n;
    }
}
