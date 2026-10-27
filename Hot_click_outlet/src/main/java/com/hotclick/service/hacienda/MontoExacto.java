package com.hotclick.service.hacienda;

/**
 * Montos en colones: los cálculos van en {@code long}; donde la entidad todavía guarda {@code int}
 * se baja con esta función, que falla en vez de truncar en silencio (L7 de #406).
 */
public final class MontoExacto {

    private MontoExacto() {}

    /** @throws IllegalStateException si el monto no cabe en un int (texto fijo, sin datos del cliente). */
    public static int aInt(long monto) {
        if (monto > Integer.MAX_VALUE || monto < Integer.MIN_VALUE) {
            throw new IllegalStateException("Monto fuera de rango");
        }
        return (int) monto;
    }
}
