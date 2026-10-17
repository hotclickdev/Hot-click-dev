package com.hotclick.exception;

/**
 * S2 · Contra entrega por negocio rechazada en el checkout. GlobalExceptionHandler responde 400 con un código
 * estable en {@code code} y en {@code data.codigo}:
 * {@link #NO_ACEPTADA} (el negocio no acepta contra entrega) o {@link #MINIMO} (el paquete no llega a su mínimo).
 * Extiende IllegalArgumentException para conservar el 400 y el rollback de los caminos que ya la atrapaban.
 */
public class ContraEntregaNoDisponibleException extends IllegalArgumentException {

    public static final String NO_ACEPTADA = "CONTRA_ENTREGA_NO_ACEPTADA";
    public static final String MINIMO = "CONTRA_ENTREGA_MINIMO";

    private final String codigo;

    public ContraEntregaNoDisponibleException(String codigo) {
        super(MINIMO.equals(codigo)
            ? "Tu pedido no llega al mínimo de este negocio para contra entrega. Pagá con SINPE / Tarjeta."
            : "Este negocio no acepta contra entrega. Pagá con SINPE / Tarjeta.");
        this.codigo = codigo;
    }

    public String getCodigo() { return codigo; }
}
