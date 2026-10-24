package com.hotclick.exception;

/** Tope de intentos excedido detectado en la capa de servicio (se responde 429). */
public class RateLimitExcedidoException extends RuntimeException {
    public RateLimitExcedidoException(String message) { super(message); }
}
