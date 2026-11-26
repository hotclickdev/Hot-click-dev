package com.hotclick.agente.canal;

import com.hotclick.agente.idioma.Idioma;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BotonIdiomaTest {

    @Test
    void losIdsNoCambianConElIdioma() {
        for (Idioma i : Idioma.values()) {
            assertThat(Boton.estandar(7L, i)).extracting(Boton::id).containsExactly("comprar:7", "ver:7", Boton.ID_PERSONA);
        }
    }

    @Test
    void sinIdiomaSigueSiendoEspanol() {
        assertThat(Boton.estandar(7L)).extracting(Boton::titulo).containsExactly("Comprar", "Ver más", "Hablar con persona");
    }

    @Test
    void tituloDeHablarConPersonaSeReconoceEnLosTresIdiomas() {
        for (Idioma i : Idioma.values()) {
            assertThat(Boton.esTituloHablarConPersona(Boton.hablarConPersona(i).titulo())).as(i.name()).isTrue();
        }
        assertThat(Boton.esTituloHablarConPersona(" talk to a PERSON ")).isTrue();
        assertThat(Boton.esTituloHablarConPersona("Comprar")).isFalse();
        assertThat(Boton.esTituloHablarConPersona(null)).isFalse();
    }

    @Test
    void respaldoDeProductoYDeBotonesSaleEnElIdiomaIndicado() {
        TarjetaProducto en = new TarjetaProducto(1L, "Gorra", BigDecimal.valueOf(5000), "https://cdn.ejemplo.test/f.jpg",
            null, null, Idioma.EN);
        assertThat(MensajesInteractivos.respaldoProducto(en)).contains("Photo: https://cdn.ejemplo.test/f.jpg",
            "Reply with the number:", "1. Buy", "2. See more", "3. Talk to a person");

        TarjetaProducto pt = new TarjetaProducto(1L, "Gorra", BigDecimal.valueOf(5000), null, null, null, Idioma.PT);
        assertThat(MensajesInteractivos.respaldoProducto(pt)).contains("Responda com o número:", "2. Ver mais",
            "3. Falar com alguém");

        assertThat(MensajesInteractivos.respaldoBotones("Hi", List.of(Boton.hablarConPersona(Idioma.EN)), Idioma.EN))
            .isEqualTo("Hi\n\nReply with the number:\n1. Talk to a person");
        assertThat(MensajesInteractivos.respaldoLista("Hi", List.of(new FilaLista("a", "Uno")), Idioma.PT))
            .isEqualTo("Hi\n\nResponda com o número:\n1. Uno");
    }
}
