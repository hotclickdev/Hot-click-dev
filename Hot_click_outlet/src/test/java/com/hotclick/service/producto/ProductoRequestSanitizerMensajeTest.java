package com.hotclick.service.producto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@DisplayName("ProductoRequestSanitizer.mensajeAmigable — solo mensajes seguros")
class ProductoRequestSanitizerMensajeTest {

    private final ProductoRequestSanitizer sanitizer = new ProductoRequestSanitizer();

    @Test
    @DisplayName("una excepción interna con SQL no llega al mensaje")
    void internaSeReemplaza() {
        String m = sanitizer.mensajeAmigable(new DataIntegrityViolationException(
            "could not execute statement [insert into hot_click_producto_tb ...]"));
        assertFalse(m.contains("hot_click_") || m.toLowerCase().contains("sql"));
        assertEquals(com.hotclick.utils.ErrorPublico.GENERICO, m);
    }

    @Test
    @DisplayName("sin mensaje: genérico, no «null»")
    void sinMensaje() {
        assertEquals(com.hotclick.utils.ErrorPublico.GENERICO, sanitizer.mensajeAmigable(new RuntimeException()));
    }

    @Test
    @DisplayName("validación propia y moderación se conservan; value too long da el aviso amigable")
    void seguras() {
        assertEquals("Precio inválido", sanitizer.mensajeAmigable(new IllegalArgumentException("Precio inválido")));
        assertEquals(new ProductoAltaService.ContenidoNoPermitidoException().getMessage(),
            sanitizer.mensajeAmigable(new ProductoAltaService.ContenidoNoPermitidoException()));
        assertFalse(sanitizer.mensajeAmigable(new RuntimeException("ERROR: value too long for type character varying(255)"))
            .contains("character varying"));
    }
}
