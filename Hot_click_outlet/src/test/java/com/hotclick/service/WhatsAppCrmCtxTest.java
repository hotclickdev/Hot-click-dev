package com.hotclick.service;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** P8-02: el WhatsApp manual del CRM solo acepta escenarios y claves permitidas, sin enlaces. */
class WhatsAppCrmCtxTest {

    @Test
    void escenarioDeAdmin_rechazado() {
        assertThatThrownBy(() -> WhatsAppService.validarCtxCrm("NUEVO_PEDIDO_ADMIN", Map.of()))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> WhatsAppService.validarCtxCrm(null, Map.of()))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void claveNoPermitida_oQueSobrescribeNombre_rechazada() {
        assertThatThrownBy(() -> WhatsAppService.validarCtxCrm("REACTIVACION", Map.of("nombre", "Banco")))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> WhatsAppService.validarCtxCrm("REACTIVACION", Map.of("link", "x")))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void enlaces_rechazados() {
        for (String v : new String[]{"https://evil.test/x", "entrá a www.banco-falso.net", "pagá en pago-seguro.com ya"}) {
            assertThatThrownBy(() -> WhatsAppService.validarCtxCrm("CARRITO_ABANDONADO", Map.of("productos", v)))
                .hasMessageContaining("enlaces");
        }
        assertThatThrownBy(() -> WhatsAppService.validarCtxCrm("REACTIVACION", Map.of("productos", "a".repeat(301))))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void contextoValido_pasa() {
        assertThat(WhatsAppService.validarCtxCrm("REACTIVACION", Map.of("diasInactivo", "30", "productos", "Camisa azul, Gorra")))
            .containsEntry("diasInactivo", "30");
    }
}
