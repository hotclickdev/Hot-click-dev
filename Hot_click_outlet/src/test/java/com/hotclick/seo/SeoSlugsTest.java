package com.hotclick.seo;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SeoSlugsTest {

    @Test
    void quitaAcentosYEspacios() {
        assertEquals("san-jose", SeoSlugs.desde("San José"));
        assertEquals("limon", SeoSlugs.desde("Limón"));
    }

    @Test
    void rechazaSlugsConMayusculasOEspacios() {
        assertTrue(SeoSlugs.esSeguro("san-jose"));
        assertFalse(SeoSlugs.esSeguro("San José"));
        assertFalse(SeoSlugs.esSeguro("../admin"));
    }
}
