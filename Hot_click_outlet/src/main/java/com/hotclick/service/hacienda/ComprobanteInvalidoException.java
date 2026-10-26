package com.hotclick.service.hacienda;

/** El XML no cumple el XSD oficial. No se envía ni se reintenta: hay que corregir los datos. */
public class ComprobanteInvalidoException extends RuntimeException {
    public ComprobanteInvalidoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
