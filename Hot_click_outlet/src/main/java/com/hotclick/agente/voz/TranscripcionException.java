package com.hotclick.agente.voz;

/** Fallo al transcribir. El mensaje nunca debe traer texto del audio ni datos del remitente. */
public class TranscripcionException extends RuntimeException {
    public TranscripcionException(String mensaje) {
        super(mensaje);
    }

    public TranscripcionException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
