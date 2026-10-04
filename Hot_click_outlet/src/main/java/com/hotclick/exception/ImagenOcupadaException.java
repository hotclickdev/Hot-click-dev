package com.hotclick.exception;

/**
 * FULL-01 / R1: no hay permiso libre para decodificar una imagen (tope global de
 * decodificaciones simultáneas). Se responde 503 con {@code Retry-After}; no es un error del
 * archivo ni una falla de S3.
 */
public class ImagenOcupadaException extends RuntimeException {

    public static final String MENSAJE =
        "Estamos procesando muchas imágenes en este momento. Probá de nuevo en unos segundos.";
    public static final int RETRY_AFTER_SEGUNDOS = 5;

    public ImagenOcupadaException() {
        super(MENSAJE);
    }
}
