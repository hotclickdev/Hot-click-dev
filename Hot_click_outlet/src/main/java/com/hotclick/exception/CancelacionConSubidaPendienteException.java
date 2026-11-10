package com.hotclick.exception;

/**
 * Cancelación pedida con una subida de plan pendiente de pago (otra suscripción ONVO en {@code onvo_sub_nueva_pendiente}).
 * No se llama a ONVO ni se toca nada local: 409 con {@link #CODIGO}.
 */
public class CancelacionConSubidaPendienteException extends RuntimeException {

    public static final String CODIGO = "CANCELACION_CON_SUBIDA_PENDIENTE";
    public static final String MENSAJE =
        "Tenés una subida de plan pendiente de pago. Completala o esperá a que venza antes de cancelar;"
            + " no cambiamos nada.";

    public CancelacionConSubidaPendienteException() {
        super("Cancelación con subida ONVO pendiente: no se toca nada");
    }
}
