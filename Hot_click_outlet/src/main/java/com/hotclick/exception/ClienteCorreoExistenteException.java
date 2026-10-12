package com.hotclick.exception;

/** P9-02: el vendedor no crea ni reclama una cuenta con un correo que ya existe (respuesta 409 genérica). */
public class ClienteCorreoExistenteException extends RuntimeException {
    public static final String MENSAJE = "No se pudo crear el cliente con ese correo. Búscalo en tus clientes existentes.";

    public ClienteCorreoExistenteException() {
        super(MENSAJE);
    }
}
