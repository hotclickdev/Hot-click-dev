package com.hotclick.exception;

/**
 * ALTO-02b: ONVO no respondió (o falló) al crear la suscripción nueva de un reemplazo. La vieja no se canceló y
 * el estado local no cambió: 503 con texto fijo en voseo.
 */
public class ReemplazoOnvoNoDisponibleException extends RuntimeException {

    public static final String CODIGO = "ONVO_NO_DISPONIBLE";
    public static final String MENSAJE =
        "ONVO no respondió y no cambiamos tu plan: seguís con el mismo y no se te cobró nada. Probá de nuevo en unos minutos.";

    public ReemplazoOnvoNoDisponibleException(Throwable causa) {
        super("Fallo al crear la suscripción nueva en ONVO", causa);
    }
}
