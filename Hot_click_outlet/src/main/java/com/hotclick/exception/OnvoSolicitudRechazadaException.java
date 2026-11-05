package com.hotclick.exception;

/**
 * ALTO-02: ONVO rechazó la solicitud (4xx) o el cliente HTTP no pudo armarla (bug nuestro, p. ej. un
 * método no soportado). No es una caída de ONVO: el circuito {@code onvo} la ignora y no se reintenta.
 * Fail-closed: el plan local no cambia y no se cobra nada.
 */
public class OnvoSolicitudRechazadaException extends RuntimeException {

    public static final String MENSAJE =
        "No pudimos cambiar tu plan en ONVO y no se te cobró nada. Probá de nuevo en unos minutos o escribinos.";
    public static final String CODIGO = "ONVO_SOLICITUD_RECHAZADA";

    public OnvoSolicitudRechazadaException(String detalle, Throwable causa) {
        super(detalle, causa);
    }
}
