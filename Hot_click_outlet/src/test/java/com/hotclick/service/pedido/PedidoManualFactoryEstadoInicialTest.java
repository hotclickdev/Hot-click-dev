package com.hotclick.service.pedido;

import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("G1 — PedidoManualFactory: solo EFECTIVO nace pagado")
class PedidoManualFactoryEstadoInicialTest {

    @Test
    @DisplayName("EFECTIVO puede nacer PAGADO o EN_PREPARACION")
    void efectivo_respetaEstadoPedido() {
        assertThat(PedidoManualFactory.estadoInicialPermitido(Constants.PEDIDO_PAGADO, "EFECTIVO"))
            .isEqualTo(Constants.PEDIDO_PAGADO);
        assertThat(PedidoManualFactory.estadoInicialPermitido("EN_PREPARACION", " efectivo "))
            .isEqualTo("EN_PREPARACION");
        assertThat(PedidoManualFactory.estadoInicialPermitido(null, "EFECTIVO"))
            .isEqualTo(Constants.PEDIDO_PENDIENTE);
    }

    @ParameterizedTest(name = "{0} pedido PAGADO nace PENDIENTE")
    @ValueSource(strings = {"SINPE", "TARJETA", "ONVO", "sinpe", "TRANSFERENCIA", "CONTRA_ENTREGA"})
    void noEfectivo_pagado_nacePendiente(String metodo) {
        assertThat(PedidoManualFactory.estadoInicialPermitido(Constants.PEDIDO_PAGADO, metodo))
            .isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(PedidoManualFactory.estadoInicialPermitido("EN_PREPARACION", metodo))
            .isEqualTo(Constants.PEDIDO_PENDIENTE);
    }

    @Test
    @DisplayName("Sin método (default SINPE) y PAGADO → PENDIENTE")
    void sinMetodo_nacePendiente() {
        assertThat(PedidoManualFactory.estadoInicialPermitido(Constants.PEDIDO_PAGADO, null))
            .isEqualTo(Constants.PEDIDO_PENDIENTE);
    }

    @Test
    @DisplayName("QA5-M-01: ENTREGADO solo para compra EXTERNO de origen MANUAL")
    void compraExternaManual_naceEntregada() {
        assertThat(PedidoManualFactory.estadoInicialPermitido(Constants.PEDIDO_ENTREGADO, "EXTERNO", "MANUAL", true))
            .isEqualTo(Constants.PEDIDO_ENTREGADO);
        assertThat(PedidoManualFactory.estadoInicialPermitido(Constants.PEDIDO_ENTREGADO, "EXTERNO", "MANUAL", false))
            .isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(PedidoManualFactory.estadoInicialPermitido(Constants.PEDIDO_ENTREGADO, "EXTERNO", "ONLINE", true))
            .isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(PedidoManualFactory.estadoInicialPermitido(Constants.PEDIDO_PAGADO, "EXTERNO", "MANUAL", true))
            .isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(PedidoManualFactory.estadoInicialPermitido(Constants.PEDIDO_ENTREGADO, "SINPE", "MANUAL", true))
            .isEqualTo(Constants.PEDIDO_PENDIENTE);
    }
}
