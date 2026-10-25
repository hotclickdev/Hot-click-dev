package com.hotclick.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Sonar S5998: el patrón de identificación SINPE es posesivo y no revienta la pila con entradas largas. */
class OnvoIdentificacionSinpeRegexTest {

    @Test
    void aceptaFormatoConGuiones() {
        assertTrue(OnvoService.identificacionSinpeValida("1-1111-11111"));
        assertTrue(OnvoService.identificacionSinpeValida("ABC-123-DEF-45"));
    }

    @Test
    void rechazaSinGuionesOGuionesMalUbicados() {
        assertFalse(OnvoService.identificacionSinpeValida("111111111111"));
        assertFalse(OnvoService.identificacionSinpeValida("-11111111111"));
        assertFalse(OnvoService.identificacionSinpeValida("11111111111-"));
        assertFalse(OnvoService.identificacionSinpeValida("1111--1111111"));
    }

    @Test
    void entradaLargaSeRechazaSinStackOverflow() {
        String larga = "a-".repeat(50_000) + "!";
        assertDoesNotThrow(() -> assertFalse(OnvoService.identificacionSinpeValida(larga)));
    }
}
