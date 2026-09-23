package com.hotclick.service.telegram;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class TelegramMenuOpcionesTest {

    @Test
    void miembroSinGestionNoVeAltas() {
        List<List<Map<String, Object>>> teclado = TelegramMenuOpciones.teclado(false, true, false);
        String datos = teclado.toString();
        assertThat(datos).doesNotContain("prd:new");
        assertThat(datos).doesNotContain("prd:pers");
        assertThat(datos).doesNotContain("vta:new");
        assertThat(datos).contains("cli:pg:0");
    }

    @Test
    void sinCrmNoVeClientes() {
        String datos = TelegramMenuOpciones.teclado(true, false, false).toString();
        assertThat(datos).contains("prd:new");
        assertThat(datos).contains("prd:pers");
        assertThat(datos).doesNotContain("cli:pg:0");
    }

    @Test
    void sinIaElTextoNoInvitaAPreguntar() {
        assertThat(TelegramMenuOpciones.texto("Bruma", false)).doesNotContain("pregunta libre");
        assertThat(TelegramMenuOpciones.texto("Bruma", true)).contains("pregunta libre");
    }
}
