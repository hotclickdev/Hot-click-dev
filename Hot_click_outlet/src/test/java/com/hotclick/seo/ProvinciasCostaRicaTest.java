package com.hotclick.seo;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProvinciasCostaRicaTest {

    @Test
    void reconoceLasSieteProvinciasAunqueVenganConAcento() {
        assertEquals("san-jose", ProvinciasCostaRica.desdeTexto("SAN JOSÉ").orElseThrow().slug());
        assertEquals("limon", ProvinciasCostaRica.desdeTexto("Limón").orElseThrow().slug());
        assertEquals(7, ProvinciasCostaRica.todas().size());
    }

    @Test
    void ignoraUnTextoQueNoEsProvincia() {
        assertTrue(ProvinciasCostaRica.desdeTexto("Narnia").isEmpty());
        assertTrue(ProvinciasCostaRica.porSlug("canton-central").isEmpty());
    }
}
