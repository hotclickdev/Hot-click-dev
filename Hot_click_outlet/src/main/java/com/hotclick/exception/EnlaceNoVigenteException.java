package com.hotclick.exception;

import org.springframework.http.HttpStatus;

/** Enlace de asignación ya usado (409) o vencido/revocado (410). */
public class EnlaceNoVigenteException extends RuntimeException {

    private final HttpStatus status;

    public EnlaceNoVigenteException(HttpStatus status, String mensaje) {
        super(mensaje);
        this.status = status;
    }

    public HttpStatus getStatus() { return status; }
}
