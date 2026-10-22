package com.hotclick.service;

import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Regla de estado inicial de ventas manuales (#221/#225). */
@DisplayName("[Ventas] estado inicial: lista blanca y fail-closed para pasarelas")
class VentaEstadoInicialTest {

    @ParameterizedTest
    @CsvSource({"TARJETA,COMPLETADO", "tarjeta,entregado", "TARJETA,Confirmado", "TARJETA,PAGADO",
                "ONVO,PAGADO", "STRIPE,COMPLETADO", "tilopay,ENTREGADO", "DESCONOCIDO,PAGADO", "' ',PAGADO",
                "SINPE,PAGADO", "sinpe,Entregado", "SINPE,COMPLETADO", "SINPE,en_preparacion"})
    void pasarelaConEstadoAvanzadoSeRechaza(String metodo, String estado) {
        assertThatThrownBy(() -> VentaService.resolverEstadoInicial(metodo, estado))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(VentaService.MSG_SOLO_PENDIENTE);
    }

    @ParameterizedTest
    @ValueSource(strings = {"TARJETA", "onvo", "STRIPE", "TILOPAY", "OTRO", "SINPE", " sinpe "})
    void pasarelaSinEstadoOPendienteQuedaPendiente(String metodo) {
        assertThat(VentaService.resolverEstadoInicial(metodo, null)).isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(VentaService.resolverEstadoInicial(metodo, " pendiente ")).isEqualTo(Constants.PEDIDO_PENDIENTE);
    }

    @ParameterizedTest
    @CsvSource({"EFECTIVO,' pagado ',PAGADO", "efectivo,Entregado,ENTREGADO", "Efectivo,,COMPLETADO",
                "EFECTIVO,en_preparacion,EN_PREPARACION"})
    void efectivoNormaliza(String metodo, String estado, String esperado) {
        assertThat(VentaService.resolverEstadoInicial(metodo, estado)).isEqualTo(esperado);
    }

    @ParameterizedTest
    @ValueSource(strings = {"INVENTADO", "CANCELADO", "REEMBOLSADO"})
    void estadoFueraDeListaBlancaSeRechaza(String estado) {
        assertThatThrownBy(() -> VentaService.resolverEstadoInicial("EFECTIVO", estado))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(VentaService.MSG_ESTADO_NO_PERMITIDO)
            .message().doesNotContain(estado);
    }

    @ParameterizedTest
    @CsvSource({"' sinpe ',SINPE", "tarjeta,TARJETA", "Efectivo,EFECTIVO", "' ',EFECTIVO", ",EFECTIVO"})
    void metodoSeNormaliza(String metodo, String esperado) {
        assertThat(VentaService.normalizarMetodo(metodo)).isEqualTo(esperado);
    }
}
