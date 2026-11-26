package com.hotclick.agente.idioma;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class TextosFijosTest {

    private static final Pattern MARCADOR = Pattern.compile("STOP|ACTIVAR|\\d+|₡|https?://\\S+");

    private static final List<Function<Idioma, String>> TEXTOS = List.of(
        i -> TextosFijos.traspaso(i, true),
        i -> TextosFijos.traspaso(i, false),
        TextosFijos::moderacion,
        i -> TextosFijos.baja(i, "NEGOCIO_X"),
        i -> TextosFijos.activar(i, "NEGOCIO_X"),
        i -> TextosFijos.comprobante(i, "PED-123"),
        TextosFijos::vozDeshabilitada,
        TextosFijos::vozFallo,
        TextosFijos::vozLarga);

    @Test
    void todosLosTextosExistenEnLosTresIdiomas() {
        for (Function<Idioma, String> f : TEXTOS) {
            for (Idioma i : Idioma.values()) {
                assertThat(f.apply(i)).as(i.name()).isNotBlank();
            }
        }
    }

    @Test
    void idiomaNuloCaeEnEspanol() {
        for (Function<Idioma, String> f : TEXTOS) {
            assertThat(f.apply(null)).isEqualTo(f.apply(Idioma.ES));
        }
    }

    @Test
    void enYPtDifierenDelEspanol() {
        for (Function<Idioma, String> f : TEXTOS) {
            assertThat(f.apply(Idioma.EN)).isNotEqualTo(f.apply(Idioma.ES));
            assertThat(f.apply(Idioma.PT)).isNotEqualTo(f.apply(Idioma.ES));
        }
    }

    @Test
    void losMarcadoresYVariablesCoincidenEntreIdiomas() {
        for (Function<Idioma, String> f : TEXTOS) {
            List<String> es = marcadores(f.apply(Idioma.ES));
            assertThat(marcadores(f.apply(Idioma.EN))).isEqualTo(es);
            assertThat(marcadores(f.apply(Idioma.PT))).isEqualTo(es);
        }
    }

    @Test
    void lasVariablesDeNegocioYPedidoSeInterpolan() {
        for (Idioma i : Idioma.values()) {
            assertThat(TextosFijos.baja(i, "NEGOCIO_X")).contains("NEGOCIO_X");
            assertThat(TextosFijos.activar(i, "NEGOCIO_X")).contains("NEGOCIO_X");
            assertThat(TextosFijos.comprobante(i, "PED-123")).contains("PED-123");
        }
    }

    private static List<String> marcadores(String texto) {
        List<String> out = new ArrayList<>();
        Matcher m = MARCADOR.matcher(texto);
        while (m.find()) out.add(m.group());
        return out;
    }
}
