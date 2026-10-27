package com.hotclick.service.producto;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("BodegaTenantGuard — regla de pertenencia de la bodega")
class BodegaTenantGuardTest {

    private static Bodega bodegaDe(Long empresaId) {
        Bodega b = new Bodega();
        if (empresaId != null) {
            Empresa e = new Empresa();
            e.setId(empresaId);
            b.setEmpresa(e);
        }
        return b;
    }

    @Test
    @DisplayName("la bodega del mismo negocio se acepta")
    void mismaEmpresa() {
        assertTrue(BodegaTenantGuard.perteneceA(bodegaDe(7L), 7L));
    }

    @Test
    @DisplayName("la bodega de otro negocio se rechaza, incluida la de la plataforma para un negocio normal")
    void otraEmpresa() {
        assertFalse(BodegaTenantGuard.perteneceA(bodegaDe(8L), 7L));
        assertFalse(BodegaTenantGuard.perteneceA(bodegaDe(1L), 7L));
        assertFalse(BodegaTenantGuard.perteneceA(bodegaDe(null), 7L));
    }

    @Test
    @DisplayName("un negocio normal no usa bodegas de la plataforma ni sin dueño; la plataforma solo las suyas")
    void plataforma() {
        assertTrue(BodegaTenantGuard.perteneceA(bodegaDe(1L), 1L));
        assertTrue(BodegaTenantGuard.perteneceA(bodegaDe(null), 1L));
        assertFalse(BodegaTenantGuard.perteneceA(bodegaDe(8L), 1L));
    }

    @Test
    @DisplayName("producto sin empresa: solo bodegas de la plataforma o sin dueño")
    void productoSinEmpresa() {
        assertTrue(BodegaTenantGuard.perteneceA(bodegaDe(null), null));
        assertTrue(BodegaTenantGuard.perteneceA(bodegaDe(1L), null));
        assertFalse(BodegaTenantGuard.perteneceA(bodegaDe(8L), null));
    }
}
