package com.hotclick.exception;

/** QA3-022: checkout o cambio al mismo plan que ya está activo → 409 PLAN_YA_ACTIVO (sin tocar ONVO). */
public class PlanYaActivoException extends IllegalArgumentException {
    public static final String CODIGO = "PLAN_YA_ACTIVO";
    public static final String MENSAJE = "Ya tenés este plan activo. No hace falta volver a contratarlo.";

    public PlanYaActivoException(String plan) {
        super("Ya tenés el plan " + plan);
    }
}
