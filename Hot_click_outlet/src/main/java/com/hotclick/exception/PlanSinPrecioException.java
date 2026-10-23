package com.hotclick.exception;

/** El plan no tiene precio mensual (USD) configurado: la API responde 409 PLAN_SIN_PRECIO, nunca 0 ni valores viejos. */
public class PlanSinPrecioException extends RuntimeException {
    public static final String CODIGO = "PLAN_SIN_PRECIO";
    public static final String MENSAJE = "Este plan todavía no tiene precio. Probá de nuevo más tarde; tu plan actual sigue igual.";
    private final String plan;

    public PlanSinPrecioException(String plan) {
        super(MENSAJE);
        this.plan = plan;
    }

    public String getPlan() { return plan; }
}
