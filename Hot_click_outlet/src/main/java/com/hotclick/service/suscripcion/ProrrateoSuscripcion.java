package com.hotclick.service.suscripcion;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Primer período de una suscripción. Con modo DIAS (por defecto) el alta cobra solo los días que
 * faltan hasta el próximo día de cobro del negocio y el período termina ese día. Con NINGUNO cobra
 * el precio completo y el período dura un mes. Lo configura {@code hotclick.billing.prorrateo}.
 */
public final class ProrrateoSuscripcion {

    public static final String DIAS = "DIAS";
    public static final String NINGUNO = "NINGUNO";

    private ProrrateoSuscripcion() {}

    public static boolean porDias(String modo) {
        return modo == null || !NINGUNO.equalsIgnoreCase(modo.trim());
    }

    /** Próximo día de cobro estrictamente posterior a {@code desde}. */
    public static LocalDate siguienteDiaCobro(LocalDate desde, int dia) {
        LocalDate esteMes = desde.withDayOfMonth(Math.min(dia, desde.lengthOfMonth()));
        if (esteMes.isAfter(desde)) return esteMes;
        LocalDate sig = desde.plusMonths(1);
        return sig.withDayOfMonth(Math.min(dia, sig.lengthOfMonth()));
    }

    public static LocalDate finPrimerPeriodo(String modo, LocalDate desde, int dia) {
        return porDias(modo) ? siguienteDiaCobro(desde, dia) : SuscripcionTilopayService.proximoCobro(desde, dia);
    }

    /** Monto del alta en colones, redondeado hacia arriba. Nunca supera el precio mensual. */
    public static long montoAlta(String modo, long precioMensual, LocalDate desde, int dia) {
        if (!porDias(modo)) return precioMensual;
        LocalDate fin = siguienteDiaCobro(desde, dia);
        LocalDate inicio = fin.minusMonths(1);
        inicio = inicio.withDayOfMonth(Math.min(dia, inicio.lengthOfMonth()));
        long total = ChronoUnit.DAYS.between(inicio, fin);
        long usados = ChronoUnit.DAYS.between(desde, fin);
        if (total <= 0 || usados >= total) return precioMensual;
        return Math.min(precioMensual, (precioMensual * usados + total - 1) / total);
    }
}
