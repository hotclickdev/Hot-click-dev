package com.hotclick.exception;

/**
 * BAJO-05: pedir CANCELADO sobre un pedido que ya está CANCELADO no es un éxito silencioso.
 * No se toca nada (ni stock, ni pago, ni correo) y se responde 409 con este mensaje.
 */
public class PedidoYaCanceladoException extends RuntimeException {

    public static final String MENSAJE = "Este pedido ya está cancelado.";

    public PedidoYaCanceladoException() {
        super(MENSAJE);
    }
}
