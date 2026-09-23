package com.hotclick.service.wallet;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Precio que absorbe comisión de pasarela (gross-up) y descuento SINPE opcional.
 * Ley 9831: no recargo explícito por tarjeta; el precio ya incluye el costo.
 */
public final class ComisionPrecioMath {

    private static final int REDONDEO_CRC = 50;

    private ComisionPrecioMath() {}

    /**
     * precioSugerido = round_50((neto + fijo) / (1 − pct/100)).
     */
    public static long precioSugerido(long neto, BigDecimal pct, long fijoCrc) {
        if (neto <= 0) {
            return 0;
        }
        BigDecimal porcentaje = pct != null ? pct : BigDecimal.ZERO;
        if (porcentaje.compareTo(BigDecimal.ZERO) < 0 || porcentaje.compareTo(new BigDecimal("99")) >= 0) {
            throw new IllegalArgumentException("pct inválido: " + porcentaje);
        }
        BigDecimal divisor = BigDecimal.ONE.subtract(
            porcentaje.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
        BigDecimal bruto = BigDecimal.valueOf(neto + Math.max(0, fijoCrc))
            .divide(divisor, 0, RoundingMode.HALF_UP);
        return redondearMultiplo(bruto.longValue(), REDONDEO_CRC);
    }

    public static long descuentoSinpe(long total, BigDecimal pct) {
        if (total <= 0 || pct == null || pct.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }
        return BigDecimal.valueOf(total)
            .multiply(pct)
            .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
            .longValue();
    }

    static long redondearMultiplo(long valor, int multiplo) {
        if (multiplo <= 0) {
            return valor;
        }
        long mitad = multiplo / 2L;
        return ((valor + mitad) / multiplo) * multiplo;
    }
}
