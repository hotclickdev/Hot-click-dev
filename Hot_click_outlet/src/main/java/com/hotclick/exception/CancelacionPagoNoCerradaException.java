package com.hotclick.exception;

/**
 * QA MEDIO (cancelación desde el panel): no se pudo confirmar en ONVO que el link/intent de pago dejó de cobrar
 * (ONVO caído, sin llave, ya pagado). El pedido no se cancela y se responde 409 con el mensaje tal cual (fail-closed,
 * igual que la cancelación del comprador de #510).
 */
public class CancelacionPagoNoCerradaException extends RuntimeException {

    public CancelacionPagoNoCerradaException(String mensaje) {
        super(mensaje);
    }
}
