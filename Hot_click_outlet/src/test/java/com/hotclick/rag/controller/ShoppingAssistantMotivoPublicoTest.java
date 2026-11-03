package com.hotclick.rag.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;

/** Seguimiento BAJO de #434: el reason de un 404/5xx nunca se expone al cliente. */
class ShoppingAssistantMotivoPublicoTest {

    private static String motivo(HttpStatus estado, String reason) {
        return ShoppingAssistantController.motivoPublico(new ResponseStatusException(estado, reason));
    }

    @Test
    @DisplayName("404 con datos en el reason → texto genérico, sin slug ni ids")
    void cuatroCeroCuatroGenerico() {
        String m = motivo(HttpStatus.NOT_FOUND, "Tienda 'mi-slug' id=42 visitor=abc no encontrada");
        assertThat(m).isEqualTo("Tienda no encontrada o inactiva").doesNotContain("mi-slug", "42", "abc");
    }

    @Test
    @DisplayName("5xx nunca devuelve el reason")
    void cincoCeroCeroGenerico() {
        assertThat(motivo(HttpStatus.INTERNAL_SERVER_ERROR, "SQL: SELECT * FROM x")).isEqualTo("No pudimos procesar la solicitud");
    }

    @Test
    @DisplayName("400 de la foto con texto fijo conocido se conserva; uno desconocido se vuelve genérico")
    void cuatroCeroCeroSoloTextosFijos() {
        assertThat(motivo(HttpStatus.BAD_REQUEST, "La imagen está vacía")).isEqualTo("La imagen está vacía");
        assertThat(motivo(HttpStatus.BAD_REQUEST, "detalle interno 123")).isEqualTo("Solicitud no válida");
        assertThat(motivo(HttpStatus.BAD_REQUEST, null)).isEqualTo("Solicitud no válida");
    }
}
