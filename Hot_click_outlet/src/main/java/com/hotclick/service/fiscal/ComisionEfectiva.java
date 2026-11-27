package com.hotclick.service.fiscal;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Regla de la comisión efectiva del marketplace: comisión del plan, más el extra configurable si el negocio
 * declaró NO_INSCRITO. Sin declarar (null), INSCRITO y REGIMEN_SIMPLIFICADO pagan solo la del plan.
 * Función pura: la usa la Fase 3 para fijar {@code marketplaceAppFee} en ONVO (un solo porcentaje, 2 decimales).
 */
public final class ComisionEfectiva {

    public record Desglose(BigDecimal planPct, BigDecimal extraPct, BigDecimal efectivaPct, SituacionFiscal situacion) {}

    private ComisionEfectiva() {}

    public static Desglose calcular(BigDecimal planPct, SituacionFiscal situacion, BigDecimal extraNoInscritoPct) {
        BigDecimal plan = escala(planPct);
        BigDecimal extra = situacion == SituacionFiscal.NO_INSCRITO ? escala(extraNoInscritoPct) : escala(null);
        return new Desglose(plan, extra, plan.add(extra), situacion);
    }

    private static BigDecimal escala(BigDecimal v) {
        if (v == null || v.signum() < 0) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
