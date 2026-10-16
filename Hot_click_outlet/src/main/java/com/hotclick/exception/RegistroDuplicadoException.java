package com.hotclick.exception;

/**
 * Alta de comprador con un correo o una identificación que ya tienen cuenta.
 * El mensaje es el mismo en los dos casos (y el status, 400, el de cualquier validación) para que el
 * registro no sirva para averiguar si una cédula o un correo existen en HotClick.
 */
public class RegistroDuplicadoException extends IllegalArgumentException {

    public static final String MENSAJE =
        "No pudimos completar el registro; si ya tenés cuenta, iniciá sesión o recuperá el acceso";

    public RegistroDuplicadoException() {
        super(MENSAJE);
    }
}
