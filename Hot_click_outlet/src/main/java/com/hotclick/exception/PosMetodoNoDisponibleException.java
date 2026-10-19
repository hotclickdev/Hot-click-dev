package com.hotclick.exception;

/** El cobro QR del POS pidió un método que ya no se ofrece (SINPE fuera de la pasarela ONVO). Responde 400. */
public class PosMetodoNoDisponibleException extends IllegalArgumentException {

    public static final String CODIGO = "METODO_PAGO_NO_DISPONIBLE";

    public PosMetodoNoDisponibleException(String mensaje) {
        super(mensaje);
    }
}
