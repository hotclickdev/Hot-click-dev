package com.hotclick.service.pos;

import com.hotclick.model.PosQrSesion;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/** Sonar S2259: sesión o reloj nulos fallan cerrado, sin NullPointerException. */
class PosQrVentaServiceNullTest {

    @Test
    void sesionNulaNoEstaVigenteYSeRechaza() {
        LocalDateTime ahora = LocalDateTime.now();
        assertFalse(PosQrVentaService.estaVigente(null, ahora));
        assertThrows(IllegalStateException.class, () -> PosQrVentaService.exigirVigente(null, ahora));
        assertThrows(IllegalStateException.class, () -> PosQrVentaService.exigirMetodoSinpe(null));
    }

    @Test
    void ahoraNuloNoEstaVigente() {
        PosQrSesion s = new PosQrSesion();
        s.setFechaExpiracion(LocalDateTime.now().plusMinutes(5));
        assertFalse(PosQrVentaService.estaVigente(s, null));
    }

    @Test
    void verificarSinpeOnvoConSesionNulaFallaCerrado() {
        PosQrVentaService svc = new PosQrVentaService();
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> svc.verificarSinpeOnvo(null));
        assertEquals(PosQrVentaService.MSG_SESION_INEXISTENTE, ex.getMessage());
    }
}
