package com.hotclick.exception;

/**
 * Otra solicitud del mismo negocio retiene el lock del alta ONVO más de lo tolerado (tope de 5 s): 409 con texto fijo,
 * sin tocar ONVO. El cliente puede reintentar; el alta única la garantiza el lock, no este error.
 */
public class AltaOnvoEnCursoException extends RuntimeException {
    public static final String CODIGO = "ALTA_ONVO_EN_CURSO";
    public static final String MENSAJE = "Ya hay una activación en curso para tu negocio. Esperá unos segundos y probá de nuevo.";

    public AltaOnvoEnCursoException() {
        super(MENSAJE);
    }
}
