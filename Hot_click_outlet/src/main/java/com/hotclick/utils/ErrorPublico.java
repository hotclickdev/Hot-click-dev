package com.hotclick.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * ESC-3: qué texto de una excepción puede ver el cliente. Solo validaciones propias (IllegalArgument,
 * IllegalState, Security y las de com.hotclick.exception); errores de base de datos, de librerías o
 * inesperados (SQL, tablas, datos personales, trazas) se reemplazan por un mensaje genérico y se registran.
 */
public final class ErrorPublico {

    public static final String GENERICO = "No pudimos completar la operación. Intentá de nuevo en unos minutos.";
    private static final Logger log = LoggerFactory.getLogger(ErrorPublico.class);

    private ErrorPublico() {}

    public static String mensaje(Throwable e) {
        String msg = e != null ? e.getMessage() : null;
        boolean propio = e instanceof IllegalArgumentException || e instanceof IllegalStateException
            || e instanceof SecurityException
            || (e != null && e.getClass().getName().startsWith("com.hotclick.exception."));
        if (propio && msg != null && !msg.isBlank() && msg.length() <= 300 && !pareceInterno(msg)) {
            return msg;
        }
        log.error("[error-no-publico] {}: {}", e != null ? e.getClass().getSimpleName() : "null", msg, e);
        return GENERICO;
    }

    private static boolean pareceInterno(String msg) {
        String m = msg.toLowerCase(java.util.Locale.ROOT);
        return m.contains("sql") || m.contains("hot_click_") || m.contains("exception") || m.contains("jdbc")
            || m.contains("constraint") || m.contains("could not execute");
    }
}
