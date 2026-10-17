package com.hotclick.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** ex.getMessage(): el handler global no devuelve textos técnicos al cliente. */
class MensajesPublicosHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void validacionPropiaSeMuestra() {
        var r = handler.handleIllegalArgument(new IllegalArgumentException("Fila 2: falta el nombre del producto."));
        assertThat(r.getBody().getMessage()).isEqualTo("Fila 2: falta el nombre del producto.");
    }

    @Test
    void textoTecnicoNoSale() {
        var r = handler.handleIllegalArgument(new IllegalArgumentException("could not execute statement; SQL [insert into hot_click_pedido_tb]"));
        assertThat(r.getBody().getMessage()).doesNotContain("SQL").doesNotContain("hot_click_");
    }

    @Test
    void optionalVacioEsRecursoNoEncontrado() {
        assertThat(GlobalExceptionHandler.mensajeNoEncontrado("No value present")).isEqualTo("Recurso no encontrado");
        assertThat(GlobalExceptionHandler.mensajeNoEncontrado("Pedido no encontrado")).isEqualTo("Pedido no encontrado");
    }
}
