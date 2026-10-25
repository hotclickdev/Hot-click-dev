package com.hotclick.utils;

import java.util.Locale;

/** A1: normalización única del correo (trim + minúsculas) para registro y login. */
public final class CorreoNormalizer {

    private CorreoNormalizer() {}

    public static String normalizar(String correo) {
        return correo == null ? null : correo.trim().toLowerCase(Locale.ROOT);
    }
}
