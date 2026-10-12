package com.hotclick.exception;

/** La pasarela de pago no tiene credenciales: el checkout responde 503 sin crear pedido. */
public class PagosNoDisponiblesException extends RuntimeException {
    public static final String MENSAJE = "Los pagos con tarjeta y SINPE Móvil no están disponibles por ahora.";

    public PagosNoDisponiblesException() {
        super(MENSAJE);
    }
}
