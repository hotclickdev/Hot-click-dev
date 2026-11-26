package com.hotclick.agente.webhook;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

class MetaWebhookFirmaTest {

    private static final byte[] CUERPO = "{\"object\":\"whatsapp_business_account\"}".getBytes(StandardCharsets.UTF_8);

    private static String firmar(MetaWebhookFirma f, byte[] cuerpo) {
        return MetaWebhookFirma.PREFIJO + HexFormat.of().formatHex(f.calcular(cuerpo));
    }

    @Test
    void firmaCorrectaSeAcepta() {
        MetaWebhookFirma f = new MetaWebhookFirma("secreto-de-prueba", "token");
        assertThat(f.firmaValida(CUERPO, firmar(f, CUERPO))).isTrue();
    }

    @Test
    void firmaEnMayusculasSeAcepta() {
        MetaWebhookFirma f = new MetaWebhookFirma("secreto-de-prueba", "token");
        String hex = HexFormat.of().formatHex(f.calcular(CUERPO)).toUpperCase();
        assertThat(f.firmaValida(CUERPO, MetaWebhookFirma.PREFIJO + hex)).isTrue();
    }

    @Test
    void cuerpoAlteradoSeRechaza() {
        MetaWebhookFirma f = new MetaWebhookFirma("secreto-de-prueba", "token");
        String firma = firmar(f, CUERPO);
        byte[] otro = "{\"object\":\"page\"}".getBytes(StandardCharsets.UTF_8);
        assertThat(f.firmaValida(otro, firma)).isFalse();
    }

    @Test
    void firmaConOtroSecretoSeRechaza() {
        MetaWebhookFirma buena = new MetaWebhookFirma("secreto-de-prueba", "token");
        MetaWebhookFirma otra = new MetaWebhookFirma("otro-secreto", "token");
        assertThat(buena.firmaValida(CUERPO, firmar(otra, CUERPO))).isFalse();
    }

    @Test
    void cabeceraAusenteMalFormadaOSinPrefijoSeRechaza() {
        MetaWebhookFirma f = new MetaWebhookFirma("secreto-de-prueba", "token");
        assertThat(f.firmaValida(CUERPO, null)).isFalse();
        assertThat(f.firmaValida(CUERPO, "sha256=no-es-hex")).isFalse();
        assertThat(f.firmaValida(CUERPO, HexFormat.of().formatHex(f.calcular(CUERPO)))).isFalse();
        assertThat(f.firmaValida(CUERPO, "sha1=abc")).isFalse();
    }

    @Test
    void sinSecretoConfiguradoTodoSeRechaza() {
        MetaWebhookFirma conSecreto = new MetaWebhookFirma("secreto-de-prueba", "token");
        MetaWebhookFirma vacio = new MetaWebhookFirma("", "");
        assertThat(vacio.configurado()).isFalse();
        assertThat(vacio.firmaValida(CUERPO, firmar(conSecreto, CUERPO))).isFalse();
        assertThat(vacio.tokenValido("")).isFalse();
    }

    @Test
    void tokenDeVerificacion() {
        MetaWebhookFirma f = new MetaWebhookFirma("s", "mi-token");
        assertThat(f.configurado()).isTrue();
        assertThat(f.tokenValido("mi-token")).isTrue();
        assertThat(f.tokenValido("mi-token ")).isFalse();
        assertThat(f.tokenValido("otro")).isFalse();
        assertThat(f.tokenValido(null)).isFalse();
    }
}
