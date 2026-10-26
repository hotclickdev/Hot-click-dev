package com.hotclick.exception;

/**
 * Regla del dueño (26-oct): una tienda suspendida por impago (SUSPENDIDO_IMPAGO / EXTENSION_IMPAGO) solo vuelve
 * a ACTIVO con un pago confirmado por ONVO. Cualquier camino admin genérico responde 409 REACTIVACION_REQUIERE_PAGO.
 */
public class ReactivacionSinPagoException extends RuntimeException {

    public static final String CODIGO = "REACTIVACION_REQUIERE_PAGO";

    public ReactivacionSinPagoException() {
        super("La tienda está suspendida por impago: solo se reactiva con un pago confirmado.");
    }
}
