package com.hotclick.service.telegram;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TelegramTecladoTest {

    @Test
    void soloMenuTieneCallbackMenu() {
        assertThat(TelegramTeclado.soloMenu().toString()).contains("menu");
    }

    @Test
    void conMenuNoDuplica() {
        var base = TelegramTeclado.soloMenu();
        assertThat(TelegramTeclado.conMenu(base)).hasSize(1);
    }
}
