package com.hotclick.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.hotclick.exception.RecursoNoEncontradoException;
import org.junit.jupiter.api.Test;

/** QA5 ALTO: el helper compartido de cancelación nunca devuelve 500. */
class PaymentControllerCancelacionHelperTest {

    private int status(PaymentController.AccionCancelacion a) {
        return PaymentController.ejecutarCancelacion(a).getStatusCode().value();
    }

    @Test
    void ok200() {
        assertThat(status(() -> { })).isEqualTo(200);
    }

    @Test
    void security403() {
        assertThat(status(() -> { throw new SecurityException("x"); })).isEqualTo(403);
    }

    @Test
    void inexistente404() {
        assertThat(status(() -> { throw new RecursoNoEncontradoException("no existe"); })).isEqualTo(404);
    }

    @Test
    void conflicto409() {
        assertThat(status(() -> { throw new IllegalStateException("ya procesado"); })).isEqualTo(409);
    }

    @Test
    void inesperado409SinFiltrarDetalle() {
        var r = PaymentController.ejecutarCancelacion(() -> { throw new RuntimeException("detalle interno"); });
        assertThat(r.getStatusCode().value()).isEqualTo(409);
        assertThat(r.getBody().getMessage()).isEqualTo("No se pudo cancelar el pedido.").doesNotContain("detalle");
    }
}
