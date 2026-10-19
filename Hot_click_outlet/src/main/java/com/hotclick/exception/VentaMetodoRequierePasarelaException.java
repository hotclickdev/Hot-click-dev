package com.hotclick.exception;

/** El registro manual de ventas pidió un método electrónico: solo se cobra dentro de la pasarela. Responde 400. */
public class VentaMetodoRequierePasarelaException extends IllegalArgumentException {

    public static final String CODIGO = "VENTA_METODO_REQUIERE_PASARELA";

    public VentaMetodoRequierePasarelaException(String mensaje) {
        super(mensaje);
    }
}
