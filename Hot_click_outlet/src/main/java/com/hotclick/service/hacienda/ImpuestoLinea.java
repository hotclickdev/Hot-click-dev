package com.hotclick.service.hacienda;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** IVA en colones enteros, redondeado por línea (HALF_UP), no sobre el total. */
public final class ImpuestoLinea {

    private ImpuestoLinea() {}

    public record Montos(long base, long impuesto) {
        public long total() {
            return base + impuesto;
        }
    }

    public static Montos de(long precioUnitario, int cantidad, BigDecimal porcentaje) {
        long base = precioUnitario * cantidad;
        if (porcentaje == null || porcentaje.signum() <= 0) {
            return new Montos(base, 0);
        }
        long impuesto = BigDecimal.valueOf(base)
            .multiply(porcentaje)
            .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
            .longValue();
        return new Montos(base, impuesto);
    }
}
