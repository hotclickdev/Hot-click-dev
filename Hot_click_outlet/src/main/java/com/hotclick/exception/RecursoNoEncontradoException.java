package com.hotclick.exception;

import java.util.NoSuchElementException;

public class RecursoNoEncontradoException extends NoSuchElementException {

    public RecursoNoEncontradoException(String mensaje) {
        super(mensaje);
    }

    public RecursoNoEncontradoException(String entidad, Object id) {
        super(entidad + " no encontrado: " + id);
    }
}
