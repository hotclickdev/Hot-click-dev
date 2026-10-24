package com.hotclick.exception;

/**
 * Cobro de planes deshabilitado (decisión HOT_CLICK: los planes no se cobran por Tilopay; ONVO aún no está
 * conectado en esta rama). Fail-closed: 409 COBRO_PLAN_NO_DISPONIBLE, no se crea cobro ni se activa el plan.
 */
public class CobroPlanNoDisponibleException extends RuntimeException {
    public static final String CODIGO = "COBRO_PLAN_NO_DISPONIBLE";
    public static final String MENSAJE = "Todavía no podemos cobrar este plan. Tu plan actual sigue igual; probá de nuevo más tarde.";
    private final String plan;

    public CobroPlanNoDisponibleException(String plan) {
        super(MENSAJE);
        this.plan = plan;
    }

    public String getPlan() { return plan; }
}
