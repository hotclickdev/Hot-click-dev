package com.hotclick.service.telegram;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TelegramPublicacionTest {

    @Test
    void conPanelYEdicionOkNoMandaOtroMensaje() {
        assertThat(TelegramPublicacion.editar(42L, true)).isTrue();
    }

    @Test
    void sinPanelOSiLaEdicionFallaHayQueEnviar() {
        assertThat(TelegramPublicacion.editar(null, true)).isFalse();
        assertThat(TelegramPublicacion.editar(42L, false)).isFalse();
    }
}
