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

    @Test
    void textoNormalEnEspanolNoEsInyeccion() {
        for (String t : new String[]{
            "Quiero la camisa \"roja\" or la azul",
            "Me dijo 'ok' or algo así",
            "Vendí 3 unidades, select de colores en la tienda",
            "La tabla de precios: drop de 10%",
            "Mi script de ventas es: saludar y ofrecer",
            "¿Tenés el modelo 'Union' en talla M?"}) {
            assertThat(TelegramTextoSospechoso.es(t)).as(t).isFalse();
        }
    }

    @Test
    void tautologiasYPatronesClarosSiSonInyeccion() {
        assertThat(TelegramTextoSospechoso.es("x' OR 1=1 --")).isTrue();
        assertThat(TelegramTextoSospechoso.es("a\" or \"a\"=\"a")).isTrue();
        assertThat(TelegramTextoSospechoso.es("1 union all select x")).isTrue();
        assertThat(TelegramTextoSospechoso.es("; DROP   TABLE usuario")).isTrue();
        assertThat(TelegramTextoSospechoso.es("<SCRIPT>alert(1)</script>")).isTrue();
        assertThat(TelegramTextoSospechoso.es("emp:1' or 1=1")).isTrue();
    }
}
