package com.hotclick.security;

import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * H-07 r2 (B-1): número de pedido decodificado y normalizado para claves de rate limit.
 * Formato real: Constants.generarNumeroPedido = prefijo ("ORD-", "POS-", "POS-QR-", "QR-") + 12 hex
 * en mayúsculas; se aceptan prefijos de letras con guiones y cuerpo alfanumérico (también ids
 * históricos/de prueba tipo HC-1001). Repetición acotada ({0,4}) para evitar backtracking
 * profundo con entradas grandes (Sonar java:S5998).
 */
public final class NumeroPedidoNormalizer {

    public static final Pattern FORMATO = Pattern.compile("^[A-Z]{1,10}(?:-[A-Z]{1,10}){0,4}-[0-9A-Z]{1,32}$");

    private static final Pattern ASCII = Pattern.compile("^[\\x00-\\x7F]+$");

    private NumeroPedidoNormalizer() {}

    /** Decodifica UNA vez (como Spring con el @PathVariable), normaliza y valida. null si no cumple. */
    public static String normalizarSegmento(String segmentoCrudo) {
        if (segmentoCrudo == null) return null;
        String decodificado;
        try {
            decodificado = UriUtils.decode(segmentoCrudo, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return null;
        }
        return normalizar(decodificado);
    }

    /** Para valores ya decodificados (p. ej. el @PathVariable). */
    public static String normalizar(String valor) {
        if (valor == null) return null;
        // O-2: solo ASCII antes de toUpperCase (ſ -> S, ı -> I colapsarían con el número real).
        if (!ASCII.matcher(valor).matches()) return null;
        String n = valor.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        return FORMATO.matcher(n).matches() ? n : null;
    }
}
