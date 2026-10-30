package com.hotclick.service.auth;

/**
 * La cuenta no está activa (estado distinto de 1) y no puede recibir tokens. El mensaje es genérico a propósito:
 * no distingue eliminada, suspendida, inactiva ni pendiente, para no permitir enumerar el estado de una cuenta.
 */
public class CuentaNoActivaException extends SecurityException {
    private static final long serialVersionUID = 1L;

    public static final String MENSAJE = "Credenciales inválidas";

    public CuentaNoActivaException() {
        super(MENSAJE);
    }
}
