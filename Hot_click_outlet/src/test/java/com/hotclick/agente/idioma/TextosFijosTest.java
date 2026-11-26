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
        TextosFijos::vozLarga,
        TextosFijos::encuestaPregunta,
        TextosFijos::encuestaBoton,
        TextosFijos::encuestaGracias,
        TextosFijos::encuestaGraciasNotaBaja,
        i -> String.join("|", TextosFijos.encuestaTitulos(i)),
        i -> TextosFijos.ofertaPregunta(i, "NEGOCIO_X"),
        TextosFijos::ofertaBotonSi,
        TextosFijos::ofertaBotonNo,
        i -> TextosFijos.ofertaAceptada(i, "NEGOCIO_X"),
        i -> TextosFijos.ofertaRechazada(i, "NEGOCIO_X"),
        i -> TextosFijos.ofertaDeBaja(i, "NEGOCIO_X"),
        TextosFijos::botonVerMas,
        TextosFijos::botonHablarConPersona,
        TextosFijos::responderConNumero,
        TextosFijos::productosTitulo,
        TextosFijos::productosCuerpo);

    /** Textos que en portugués coinciden con el español (misma palabra en los dos idiomas). */
    private static final List<Function<Idioma, String>> IGUALES_ES_PT = List.of(
        TextosFijos::botonComprar, TextosFijos::foto);

    @Test
    void todosLosTextosExistenEnLosTresIdiomas() {
        for (Function<Idioma, String> f : TEXTOS) {
            for (Idioma i : Idioma.values()) {
                assertThat(f.apply(i)).as(i.name()).isNotBlank();
            }
        }
    }

    @Test
    void textosCortosDeBotonesEntranEnLosLimitesDeWhatsApp() {
        for (Idioma i : Idioma.values()) {
            for (String t : List.of(TextosFijos.encuestaBoton(i), TextosFijos.ofertaBotonSi(i),
                    TextosFijos.ofertaBotonNo(i), TextosFijos.botonComprar(i), TextosFijos.botonVerMas(i),
                    TextosFijos.botonHablarConPersona(i))) {
                assertThat(t.length()).as(i + ": " + t).isLessThanOrEqualTo(20);
            }
            assertThat(TextosFijos.encuestaTitulos(i)).hasSize(5).allSatisfy(t -> assertThat(t.length()).isLessThanOrEqualTo(24));
            assertThat(TextosFijos.productosTitulo(i).length()).isLessThanOrEqualTo(60);
        }
    }

    @Test
    void elPortuguesLlevaTildesYNoQuedanFormasSinTilde() {
        for (Function<Idioma, String> f : TEXTOS) {
            assertThat(f.apply(Idioma.PT)).doesNotContain(" voce ", " nao ", " Nao ", "eletronico", "promocoes");
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
        for (Function<Idioma, String> f : IGUALES_ES_PT) {
            assertThat(f.apply(Idioma.EN)).isNotEqualTo(f.apply(Idioma.ES));
            assertThat(f.apply(Idioma.PT)).isNotBlank();
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
            assertThat(TextosFijos.ofertaPregunta(i, "NEGOCIO_X")).contains("NEGOCIO_X");
            assertThat(TextosFijos.ofertaAceptada(i, "NEGOCIO_X")).contains("NEGOCIO_X");
            assertThat(TextosFijos.ofertaRechazada(i, "NEGOCIO_X")).contains("NEGOCIO_X");
            assertThat(TextosFijos.ofertaDeBaja(i, "NEGOCIO_X")).contains("NEGOCIO_X");
        }
    }

    private static List<String> marcadores(String texto) {
        List<String> out = new ArrayList<>();
        Matcher m = MARCADOR.matcher(texto);
        while (m.find()) out.add(m.group());
        return out;
    }
}
