package com.hotclick.service.telegram;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Regresión de los hallazgos del Auditor 8 (bot de Telegram). Datos ficticios. */
class TelegramAuditor8Test {

    @Test
    void filtroDetectaBypassesDelAuditor8() {
        for (String t : new String[]{
            "1 union/**/select * from usuario",
            "1 ＵＮＩＯＮ ＳＥＬＥＣＴ * from usuario",
            "x' or true --",
            "x\" OR 1 --",
            "<svg onload=alert(1)>",
            "<svg/onload=alert(1)>",
            "<img src=x onerror = alert(1)>"}) {
            assertThat(TelegramTextoSospechoso.es(t)).as(t).isTrue();
        }
    }

    @Test
    void filtroNoMarcaTextoNormal() {
        for (String t : new String[]{
            "Camisa talla M, color azul",
            "La promo es verdadera or true según el cliente",
            "Envío a Heredia: 2 unidades",
            "Me dijo 'ok' or algo así"}) {
            assertThat(TelegramTextoSospechoso.es(t)).as(t).isFalse();
        }
    }

    @Test
    void sinTokenTapaEncodingDoble() {
        String txt = "GET https://api.telegram.org/bot000000%253AFAKEtokenFAKEtokenFAKE/getFile";
        assertThat(TelegramTexto.sinToken(txt)).doesNotContain("FAKEtoken");
        assertThat(TelegramTexto.sinToken("id 0000000%253AFAKEtoken12 fin")).doesNotContain("FAKEtoken12");
    }

    @Test
    void sinTokenTapaTokensCortos() {
        assertThat(TelegramTexto.sinToken("token 0000000:FAKEshort12 fin")).doesNotContain("FAKEshort12");
        assertThat(TelegramTexto.sinToken("son las 10:30 del día")).isEqualTo("son las 10:30 del día");
    }
}
