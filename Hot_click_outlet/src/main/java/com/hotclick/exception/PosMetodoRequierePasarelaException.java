package com.hotclick.exception;

/** La venta directa del POS pidió un método electrónico: solo se cobra dentro de la pasarela. Responde 400. */
public class PosMetodoRequierePasarelaException extends IllegalArgumentException {

    public static final String CODIGO = "POS_METODO_REQUIERE_PASARELA";

    public PosMetodoRequierePasarelaException(String mensaje) {
        super(mensaje);
    }
}
