package com.hotclick.service.suscripcion;

import com.hotclick.utils.Constants;

import java.util.Locale;
import java.util.Set;

/** Estados en los que la suscripción ONVO del plan vigente todavía no confirmó el alta. */
public final class MembresiaPlan {

    private MembresiaPlan() {}

    /** ONVO incomplete/pending guardado en la fila local (el alta nueva nace en TRIAL). */
    public static final Set<String> ESTADOS_ALTA_SIN_CONFIRMAR =
        Set.of("TRIAL", "INCOMPLETE", "PENDING", "PENDIENTE");

    public static boolean sinConfirmar(String estadoPlan) {
        return Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA.equals(estadoPlan);
    }

    public static boolean altaLocalSinConfirmar(String estadoSuscripcion) {
        if (estadoSuscripcion == null || estadoSuscripcion.isBlank()) return false;
        return ESTADOS_ALTA_SIN_CONFIRMAR.contains(estadoSuscripcion.toUpperCase(Locale.ROOT));
    }
}
