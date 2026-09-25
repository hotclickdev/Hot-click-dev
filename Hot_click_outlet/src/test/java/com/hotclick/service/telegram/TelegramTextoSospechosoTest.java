package com.hotclick.service.telegram;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TelegramTextoSospechosoTest {

    @Test
    void nombreDeProductoNoEsInyeccion() {
        assertThat(TelegramTextoSospechoso.es("Camisa para hombre roja")).isFalse();
    }

    @Test
    void unionSelectEsInyeccion() {
        assertThat(TelegramTextoSospechoso.es("1 UNION SELECT * FROM usuario")).isTrue();
    }

    @Test
    void listoNoEsInyeccion() {
        assertThat(TelegramTextoSospechoso.es("Listo")).isFalse();
        assertThat(TelegramFlujoProductoTextoHelper.esListo("Listo")).isTrue();
        assertThat(TelegramFlujoProductoTextoHelper.esListo("foto")).isFalse();
    }
}
