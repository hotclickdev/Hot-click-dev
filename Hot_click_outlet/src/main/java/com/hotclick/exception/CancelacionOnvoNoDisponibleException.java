package com.hotclick.exception;

/**
 * MEDIO Seguridad (Opción A): el negocio pidió cancelar una suscripción con id ONVO y ONVO no confirmó la cancelación
 * (falla, timeout o respuesta ambigua). Fail-closed: 503 con {@link #CODIGO} y CERO cambios locales.
 */
public class CancelacionOnvoNoDisponibleException extends RuntimeException {

    public static final String CODIGO = "CANCELACION_ONVO_NO_DISPONIBLE";
    public static final String MENSAJE =
        "No pudimos confirmar la cancelación con ONVO, así que no cambiamos nada en tu suscripción."
            + " Probá de nuevo en unos minutos.";

    public CancelacionOnvoNoDisponibleException() {
        super("ONVO no confirmó la cancelación de la suscripción; no se aplicó nada localmente");
    }
}
