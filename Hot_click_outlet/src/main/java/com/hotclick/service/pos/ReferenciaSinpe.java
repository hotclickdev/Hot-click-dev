package com.hotclick.service.pos;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Número de referencia/comprobante de un SINPE confirmado en caja: obligatorio, solo letras y dígitos
 * (sin espacios, símbolos ni texto libre), entre {@value #MIN} y {@value #MAX} caracteres. Se guarda en mayúsculas.
 * Los mensajes son fijos: nunca repiten el valor recibido.
 */
public final class ReferenciaSinpe {

    public static final int MIN = 6;
    public static final int MAX = 30;
    public static final String MSG_INVALIDA =
        "La referencia del SINPE es obligatoria: solo letras y números, entre " + MIN + " y " + MAX + " caracteres";
    public static final String MSG_REPETIDA = "Esa referencia de SINPE ya se usó en otra venta";
    private static final Pattern FORMATO = Pattern.compile("^[A-Z0-9]{" + MIN + "," + MAX + "}$");

    private ReferenciaSinpe() {}

    /** Devuelve la referencia normalizada o lanza {@link IllegalArgumentException} con {@link #MSG_INVALIDA}. */
    public static String validar(Object cruda) {
        if (!(cruda instanceof String s)) throw new IllegalArgumentException(MSG_INVALIDA);
        String ref = s.trim().toUpperCase(Locale.ROOT);
        if (!FORMATO.matcher(ref).matches()) throw new IllegalArgumentException(MSG_INVALIDA);
        return ref;
    }
}
