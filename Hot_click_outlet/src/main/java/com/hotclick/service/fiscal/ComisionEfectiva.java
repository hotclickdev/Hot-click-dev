package com.hotclick.service.fiscal;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Regla de la comisión efectiva del marketplace: comisión del plan, más el extra configurable salvo que el negocio
 * esté INSCRITO o en REGIMEN_SIMPLIFICADO Y un ADMIN haya verificado lo declarado. Sin declarar (null), NO_INSCRITO
 * y lo declarado sin verificar pagan plan + extra.
 * Función pura: la usa la Fase 3 para fijar {@code marketplaceAppFee} en ONVO (un solo porcentaje, 2 decimales).
 */
public final class ComisionEfectiva {

    public record Desglose(BigDecimal planPct, BigDecimal extraPct, BigDecimal efectivaPct, SituacionFiscal situacion) {}

    private ComisionEfectiva() {}

    /** El extra se cobra salvo que la inscripción (INSCRITO o RS) esté verificada por un ADMIN. */
    public static boolean pagaExtra(SituacionFiscal situacion, boolean verificado) {
        return situacion == null || situacion == SituacionFiscal.NO_INSCRITO || !verificado;
    }

    /** Sin verificación: lo declarado todavía no quita el extra. */
    public static Desglose calcular(BigDecimal planPct, SituacionFiscal situacion, BigDecimal extraNoInscritoPct) {
        return calcular(planPct, situacion, false, extraNoInscritoPct);
    }

    public static Desglose calcular(BigDecimal planPct, SituacionFiscal situacion, boolean verificado,
                                    BigDecimal extraNoInscritoPct) {
        BigDecimal plan = escala(planPct);
        BigDecimal extra = pagaExtra(situacion, verificado) ? escala(extraNoInscritoPct) : escala(null);
        return new Desglose(plan, extra, plan.add(extra), situacion);
    }

    private static BigDecimal escala(BigDecimal v) {
        if (v == null || v.signum() < 0) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
