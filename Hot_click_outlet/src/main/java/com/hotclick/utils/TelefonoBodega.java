package com.hotclick.utils;

import java.util.regex.Pattern;

/**
 * Teléfono de bodega (SEC-08): misma regla que el wizard "Nueva bodega" del front
 * ({@code nuevaBodegaHelpers.ts}) y se guarda como {@code +} y solo dígitos.
 * <ul>
 *   <li>Costa Rica: {@code +506} y 8 dígitos. Sin {@code +}, 8 dígitos se toman como un número
 *       local de Costa Rica (formularios que mandan {@code 8812-0034}).</li>
 *   <li>Otro código de país: con {@code +}, de 8 a 15 dígitos (largo E.164) y sin empezar en 0.</li>
 *   <li>Solo se aceptan dígitos, espacios, guiones, puntos y paréntesis; cualquier otra cosa
 *       (letras, HTML) es inválida.</li>
 * </ul>
 */
public final class TelefonoBodega {

    /** Mismo texto que {@code TELEFONO_INVALIDO} del front ({@code checkout.phoneInvalid}). */
    public static final String MENSAJE_INVALIDO = "Ingresá un número válido (8 dígitos)";
    public static final String MENSAJE_OBLIGATORIO = "El teléfono es obligatorio";

    private static final String CODIGO_CR = "506";
    private static final int DIGITOS_CR = 8;
    private static final int MIN_DIGITOS_INTERNACIONAL = 8;
    private static final int MAX_DIGITOS_E164 = 15;
    /** Tope de lo que se recibe antes de normalizar (con separadores); la columna guarda 20. */
    private static final int MAX_LARGO_ENTRADA = 30;
    private static final Pattern PERMITIDOS = Pattern.compile("^\\+?[0-9 ().\\-]+$");

    private TelefonoBodega() {}

    /**
     * Devuelve el teléfono normalizado ({@code +50688881234}).
     *
     * @throws IllegalArgumentException con {@link #MENSAJE_OBLIGATORIO} o {@link #MENSAJE_INVALIDO}
     */
    public static String normalizar(String valor) {
        if (valor == null || valor.isBlank()) throw new IllegalArgumentException(MENSAJE_OBLIGATORIO);
        String texto = valor.trim();
        if (texto.length() > MAX_LARGO_ENTRADA || !PERMITIDOS.matcher(texto).matches()) {
            throw new IllegalArgumentException(MENSAJE_INVALIDO);
        }
        String digitos = texto.replaceAll("\\D", "");
        if (digitos.isEmpty()) throw new IllegalArgumentException(MENSAJE_OBLIGATORIO);
        boolean conCodigo = texto.startsWith("+");

        if (!conCodigo) {
            if (digitos.length() == DIGITOS_CR) return "+" + CODIGO_CR + digitos;
            if (digitos.length() == CODIGO_CR.length() + DIGITOS_CR && digitos.startsWith(CODIGO_CR)) return "+" + digitos;
            throw new IllegalArgumentException(MENSAJE_INVALIDO);
        }
        if (digitos.startsWith(CODIGO_CR)) {
            if (digitos.length() == CODIGO_CR.length() + DIGITOS_CR) return "+" + digitos;
            throw new IllegalArgumentException(MENSAJE_INVALIDO);
        }
        if (digitos.charAt(0) == '0'
                || digitos.length() < MIN_DIGITOS_INTERNACIONAL
                || digitos.length() > MAX_DIGITOS_E164) {
            throw new IllegalArgumentException(MENSAJE_INVALIDO);
        }
        return "+" + digitos;
    }
}
