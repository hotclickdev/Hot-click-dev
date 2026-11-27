package com.hotclick.service.fiscal;

/** El negocio agotó los envíos diarios de "Ya me inscribí" (cada uno consulta a Hacienda). */
public class LimiteIntentosFiscalException extends RuntimeException {
    public LimiteIntentosFiscalException() {
        super("Ya enviaste tus datos varias veces hoy. Intentá de nuevo mañana.");
    }
}
