package com.hotclick.exception;

/** El estado inicial pedido para la venta manual no es un valor reconocido. Responde 400. */
public class VentaEstadoInicialInvalidoException extends IllegalArgumentException {

    public static final String CODIGO = "VENTA_ESTADO_INICIAL_INVALIDO";

    public VentaEstadoInicialInvalidoException(String mensaje) {
        super(mensaje);
    }
}
