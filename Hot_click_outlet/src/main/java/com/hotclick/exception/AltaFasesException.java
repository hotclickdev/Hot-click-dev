package com.hotclick.exception;

/**
 * Alta por fases: la acción pide una fase que el negocio todavía no cumple (p. ej. aprobar sin cuenta ONVO ACTIVA).
 * Fail-closed: 409 con {@code codigo}; no se publica ni se cobra.
 */
public class AltaFasesException extends RuntimeException {
    public static final String CODIGO_CUENTA_NO_ACTIVA = "ALTA_CUENTA_ONVO_NO_ACTIVA";
    public static final String MENSAJE_CUENTA_NO_ACTIVA =
        "El negocio todavía no tiene su cuenta ONVO activa; no se puede aprobar ni publicar.";

    private final String codigo;

    public AltaFasesException(String codigo, String mensaje) {
        super(mensaje);
        this.codigo = codigo;
    }

    public String getCodigo() { return codigo; }

    public static AltaFasesException cuentaNoActiva() {
        return new AltaFasesException(CODIGO_CUENTA_NO_ACTIVA, MENSAJE_CUENTA_NO_ACTIVA);
    }
}
