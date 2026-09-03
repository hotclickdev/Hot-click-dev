package com.hotclick.service.wallet;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Cálculo puro de comisiones del modelo agregador.
 * El % del plan es all-in (pasarela + margen HotClick).
 * {@code pctGateway} solo reparte contablemente: reserva estimada ONVO vs SaaS.
 */
public final class AggregatorCommissionMath {

    public static final String PLAN_EMPRENDEDOR = "EMPRENDEDOR";

    private AggregatorCommissionMath() {}

    public record Resultado(long comisionSaas, long comisionGw, long neto, long totalComision) {}

    public static Resultado calcular(long bruto,
                                     BigDecimal pctPlan,
                                     boolean aplicaMinimo,
                                     long minimoCrc,
                                     int pctGateway) {
        if (bruto <= 0) {
            return new Resultado(0, 0, 0, 0);
        }

        BigDecimal pct = pctPlan != null ? pctPlan : BigDecimal.ZERO;
        long total = pctDe(bruto, pct);
        if (aplicaMinimo && minimoCrc > 0) {
            total = Math.max(total, minimoCrc);
        }
        if (total >= bruto) {
            return new Resultado(0, 0, 0, total);
        }

        long comGw = Math.min(pctDeEntero(bruto, pctGateway), total);
        long comSaas = total - comGw;
        return new Resultado(comSaas, comGw, bruto - total, total);
    }

    public static boolean aplicaMinimoEmprendedor(String nombrePlan) {
        return PLAN_EMPRENDEDOR.equalsIgnoreCase(nombrePlan);
    }

    private static long pctDe(long bruto, BigDecimal pct) {
        return BigDecimal.valueOf(bruto)
            .multiply(pct)
            .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
            .longValue();
    }

    private static long pctDeEntero(long bruto, int pct) {
        return pctDe(bruto, BigDecimal.valueOf(pct));
    }
}
