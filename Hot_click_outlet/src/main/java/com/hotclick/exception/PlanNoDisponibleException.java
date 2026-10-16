package com.hotclick.exception;

/** ESC-5: el plan existe pero todavía no tiene precio ni cobro habilitado (los montos los define HOT_CLICK). */
public class PlanNoDisponibleException extends RuntimeException {
    public static final String MENSAJE =
        "Este plan todavía no se puede contratar en línea: el cobro en línea todavía está pendiente. "
        + "Tu plan actual sigue igual.";

    public PlanNoDisponibleException() {
        super(MENSAJE);
    }
}
