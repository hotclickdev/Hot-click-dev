package com.hotclick.exception;

/**
 * ALTO-02b: falta la variable ONVO_PRICE_ID_{PLAN} del plan pedido. Fail-closed: no se llama a ONVO, no se cobra nada
 * y el plan sigue igual. /cambiar-plan responde 503 ONVO_PRICE_ID_FALTANTE; el detalle queda en el log [ALERTA-PAGO].
 * Extiende IllegalArgumentException para que los demás llamadores sigan respondiendo el 400 genérico de antes.
 */
public class PriceIdOnvoFaltanteException extends IllegalArgumentException {
    public static final String CODIGO = "ONVO_PRICE_ID_FALTANTE";
    public static final String MENSAJE =
        "Este plan todavía no se puede pagar porque falta configurar su precio en ONVO. No se te cobró nada y tu plan"
            + " sigue igual. Escribinos si necesitás ayuda.";
    private final String plan;

    public PriceIdOnvoFaltanteException(String plan) {
        super("Falta ONVO_PRICE_ID_" + plan);
        this.plan = plan;
    }

    public String getPlan() { return plan; }
}
