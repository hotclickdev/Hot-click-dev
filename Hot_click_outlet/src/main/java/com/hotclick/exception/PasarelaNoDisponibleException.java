package com.hotclick.exception;

/**
 * No hay una pasarela de pago conectada para cobrar en línea (ONVO marketplace
 * todavía no está activo). Nunca se cae a otra pasarela: el cobro se rechaza con este mensaje.
 */
public class PasarelaNoDisponibleException extends RuntimeException {
    public static final String MENSAJE =
        "Los pagos en línea no están disponibles por ahora. Tu plan actual sigue igual.";

    public PasarelaNoDisponibleException() {
        super(MENSAJE);
    }
}
