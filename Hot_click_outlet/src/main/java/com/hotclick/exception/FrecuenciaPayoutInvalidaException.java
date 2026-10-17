package com.hotclick.exception;

import java.util.Locale;
import java.util.Set;

/**
 * Alta de negocio sin frecuencia de liquidación o con un valor inválido (decisión del dueño, 16-oct-2026: el
 * negocio elige QUINCENAL o MENSUAL al registrarse; no hay valor por defecto). GlobalExceptionHandler responde
 * 400 con {@code code = "FRECUENCIA_INVALIDA"} (también en {@code data.codigo}). No extiende
 * IllegalArgumentException para que ningún catch genérico la convierta en un 400 sin código o en un 500.
 */
public class FrecuenciaPayoutInvalidaException extends RuntimeException {

    public static final String CODIGO = "FRECUENCIA_INVALIDA";
    public static final Set<String> VALORES = Set.of("QUINCENAL", "MENSUAL");

    public FrecuenciaPayoutInvalidaException() {
        super("Elegí cómo querés recibir tus pagos: QUINCENAL o MENSUAL.");
    }

    /** Normaliza (trim + mayúsculas) y exige la frecuencia; lanza esta excepción si falta o no es válida. */
    public static String requerida(String valor) {
        String f = valor == null ? "" : valor.trim().toUpperCase(Locale.ROOT);
        if (!VALORES.contains(f)) throw new FrecuenciaPayoutInvalidaException();
        return f;
    }
}
