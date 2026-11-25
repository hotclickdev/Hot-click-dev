package com.hotclick.agente.idioma;

import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.TonoAgente;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AG-39: idioma del cliente, prompt y textos fijos")
class IdiomaTest {

    @Test
    @DisplayName("detecta inglés, portugués y español por palabras frecuentes")
    void detectaLosTresIdiomas() {
        assertThat(Idioma.deTexto("Hello, how much does the blue bag cost?")).isEqualTo(Idioma.EN);
        assertThat(Idioma.deTexto("Olá, quanto custa a bolsa? Voces fazem entrega?")).isEqualTo(Idioma.PT);
        assertThat(Idioma.deTexto("Hola, cuánto cuesta el bolso? Tienen envío?")).isEqualTo(Idioma.ES);
    }

    @Test
    @DisplayName("sin pistas usa los mensajes anteriores del cliente y luego español")
    void sinPistasUsaElHistorialYLuegoEspanol() {
        assertThat(Idioma.detectar("ok", List.of("ok", "Do you ship to Liberia?"))).isEqualTo(Idioma.EN);
        assertThat(Idioma.detectar("👍", List.of())).isEqualTo(Idioma.ES);
        assertThat(Idioma.detectar(null, null)).isEqualTo(Idioma.ES);
        // El mensaje actual manda sobre el historial.
        assertThat(Idioma.detectar("hola, quiero un bolso", List.of("hello please"))).isEqualTo(Idioma.ES);
    }

    @Test
    @DisplayName("solo mira los 3 mensajes previos más recientes")
    void limitaElHistorial() {
        assertThat(Idioma.detectar("ok", List.of("ok", "ok", "ok", "hello please can you help"))).isEqualTo(Idioma.ES);
    }

    @Test
    @DisplayName("el prompt en inglés pide responder en inglés y conserva precios en colones; el de español no cambia")
    void promptPorIdioma() {
        String es = PerfilAgente.HOTCLICK.promptSistema(TonoAgente.POR_DEFECTO, "HotClick");
        String esExplicito = PerfilAgente.HOTCLICK.promptSistema(TonoAgente.POR_DEFECTO, "HotClick", Idioma.ES);
        String en = PerfilAgente.HOTCLICK.promptSistema(TonoAgente.POR_DEFECTO, "HotClick", Idioma.EN);
        String pt = PerfilAgente.HOTCLICK.promptSistema(TonoAgente.POR_DEFECTO, "HotClick", Idioma.PT);

        assertThat(esExplicito).isEqualTo(es); // mismo prefijo: el caché de prompt no se invalida
        assertThat(en).startsWith(es).contains("inglés").contains("colones").contains("sin convertir a dólares");
        assertThat(pt).startsWith(es).contains("portugués").contains("colones");
    }

    @Test
    @DisplayName("los textos fijos salen en el idioma detectado y un idioma nulo cae en español")
    void textosFijos() {
        assertThat(TextosFijos.traspaso(Idioma.EN, true)).contains("team will continue");
        assertThat(TextosFijos.traspaso(Idioma.PT, true)).contains("equipe");
        assertThat(TextosFijos.traspaso(null, true)).contains("le paso con una persona");
        assertThat(TextosFijos.traspaso(Idioma.ES, false)).contains("te paso con una persona");
        assertThat(TextosFijos.moderacion(Idioma.EN)).startsWith("I can only help");
        assertThat(TextosFijos.baja(Idioma.EN, "Tienda Uno")).contains("Tienda Uno").contains("ACTIVAR");
        assertThat(TextosFijos.activar(Idioma.PT, "Tienda Uno")).contains("STOP");
        assertThat(TextosFijos.comprobante(Idioma.EN, "HC-1")).contains("HC-1").doesNotContain("http");
    }
}
