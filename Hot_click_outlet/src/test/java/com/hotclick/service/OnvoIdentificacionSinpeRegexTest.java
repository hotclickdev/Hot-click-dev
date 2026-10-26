package com.hotclick.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Sonar S5998: la validación de identificación SINPE no revienta la pila con entradas largas. */
class OnvoIdentificacionSinpeRegexTest {

    @Test
    void entradaLargaSeRechazaSinStackOverflow() {
        String larga = "a-".repeat(50_000) + "!";
        for (int t : new int[]{0, 1, 2, 3, 4, 5, 9}) {
            final int tipo = t;
            assertDoesNotThrow(() -> assertFalse(OnvoService.identificacionSinpeValida(larga, tipo)));
        }
        assertNull(OnvoService.normalizarNumeroSinpe("8".repeat(100_000)));
    }
}
