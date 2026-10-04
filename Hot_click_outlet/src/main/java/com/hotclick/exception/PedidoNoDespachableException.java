package com.hotclick.exception;

/**
 * El pedido no se puede despachar (guía, envío o estado ENVIADO) porque su pago no está
 * confirmado o porque está cancelado. Se responde 409 con el mensaje tal cual.
 */
public class PedidoNoDespachableException extends RuntimeException {

    public PedidoNoDespachableException(String mensaje) {
        super(mensaje);
    }
}
