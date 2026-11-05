package com.hotclick.exception;

/**
 * ALTO-02b (Seguridad): la suscripción ONVO está en trialing y ya tiene método de pago. No se reemplaza (ONVO la
 * cobraría al terminar el trial si la cancelación de la vieja fallara): 422 sin tocar ONVO ni el estado local.
 */
public class TrialConMetodoPagoException extends OnvoSolicitudRechazadaException {

    public static final String CODIGO = "ONVO_TRIAL_CON_METODO_PAGO";
    public static final String MENSAJE =
        "No podemos cambiar tu plan mientras dura tu prueba con la tarjeta ya registrada. Tu plan sigue igual y no se"
            + " te cobró nada. Cuando termine la prueba vas a poder cambiarlo, o escribinos si lo necesitás antes.";

    public TrialConMetodoPagoException() {
        super("Suscripción en trialing con método de pago: no se reemplaza", null);
    }
}
