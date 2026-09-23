package com.hotclick.service.wallet;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ComisionPrecioMathTest {

    @Test
    void precioSugerido_ejemploPlan() {
        // (10000 + 200) / (1 - 0.048) ≈ 10714 → 10700 o 10750 según redondeo a 50
        long sugerido = ComisionPrecioMath.precioSugerido(10_000, new BigDecimal("4.80"), 200);
        assertEquals(10_700, sugerido);
    }

    @Test
    void precioSugerido_netoCero() {
        assertEquals(0, ComisionPrecioMath.precioSugerido(0, new BigDecimal("4.80"), 200));
    }

    @Test
    void precioSugerido_pctInvalido() {
        assertThrows(IllegalArgumentException.class,
            () -> ComisionPrecioMath.precioSugerido(1000, new BigDecimal("100"), 0));
    }

    @Test
    void descuentoSinpe_aplica() {
        assertEquals(500, ComisionPrecioMath.descuentoSinpe(10_000, new BigDecimal("5")));
    }

    @Test
    void descuentoSinpe_ceroSiPctCero() {
        assertEquals(0, ComisionPrecioMath.descuentoSinpe(10_000, BigDecimal.ZERO));
    }
}
