package com.hotclick.service.suscripcion;

import com.hotclick.catalogo.CatalogoPublicoGate;

import java.util.Locale;
import java.util.Set;

/** Estados en los que la suscripción ONVO del plan vigente todavía no confirmó el alta. */
public final class MembresiaPlan {

    private MembresiaPlan() {}

    /**
     * Estados locales que no son un trial real y justifican un GET a ONVO.
     * TRIAL es el estado por defecto de la fila y tambien el trial de verdad: no se consulta solo por eso.
     */
    public static final Set<String> ESTADOS_ALTA_INCOMPLETA = Set.of("INCOMPLETE", "PENDING", "PENDIENTE");

    public static boolean sinConfirmar(String estadoPlan) {
        return !CatalogoPublicoGate.membresiaConfirmada(estadoPlan);
    }

    public static boolean altaIncompleta(String estadoSuscripcion) {
        if (estadoSuscripcion == null || estadoSuscripcion.isBlank()) return false;
        return ESTADOS_ALTA_INCOMPLETA.contains(estadoSuscripcion.toUpperCase(Locale.ROOT));
    }
}
