package com.hotclick.service.suscripcion;

/**
 * Falla interna al leer el catálogo de planes (snapshot no confirmado, paginación mal armada). No es culpa del
 * cliente: a propósito NO extiende IllegalStateException/IllegalArgumentException (que el GlobalExceptionHandler
 * responde 400 con el mensaje), así cae en el manejador genérico: 500 «Error interno del servidor», sin detalle.
 */
public class LecturaPlanesException extends RuntimeException {
    public LecturaPlanesException(String mensaje) {
        super(mensaje);
    }
}
