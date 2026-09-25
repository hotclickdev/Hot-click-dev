package com.hotclick.service.prueba;

import com.hotclick.utils.Constants;

import java.time.LocalDate;

/** Cuándo una prueba QA de un mes debe cerrarse. */
public final class PruebaPlanCierre {

    private PruebaPlanCierre() {}

    public static LocalDate venceEn(LocalDate hoy) {
        return hoy.plusDays(Constants.DIAS_PRUEBA_QA);
    }

    /** Cierra el día del vencimiento. Antes de esa fecha la prueba sigue abierta. */
    public static boolean debeCerrar(String estadoPlan, LocalDate vence, LocalDate hoy) {
        if (!Constants.ESTADO_PLAN_TRIAL.equals(estadoPlan) || vence == null || hoy == null) {
            return false;
        }
        return !hoy.isBefore(vence);
    }
}
