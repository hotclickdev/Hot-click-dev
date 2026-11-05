package com.hotclick.exception;

/**
 * La suscripción ONVO ya está cobrada y el cambio pedido no es subir a Negocio Plus: no se toca ONVO ni el plan.
 * 422 con el mensaje para mandar la solicitud (la revisa el equipo). Hereda de {@link OnvoSolicitudRechazadaException}
 * para que el circuito de ONVO la ignore (no es una falla de ONVO).
 */
public class CambioPlanRequiereSolicitudException extends OnvoSolicitudRechazadaException {

    public static final String CODIGO = "CAMBIO_PLAN_REQUIERE_SOLICITUD";
    public static final String MENSAJE =
        "Tu plan ya está cobrado, así que este cambio no se hace solo. Mandanos la solicitud desde Planes con el plan"
            + " que querés y el motivo; la revisamos y te avisamos. Tu plan sigue igual y no se te cobró nada.";

    public CambioPlanRequiereSolicitudException() {
        super("Cambio de plan sobre suscripción cobrada: requiere solicitud", null);
    }
}
