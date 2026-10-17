package com.hotclick.service.moderacion;

import com.hotclick.model.TerminoProhibido;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/** QA-NEG-038: coincidencia pura (sin base de datos) de términos prohibidos sobre texto normalizado. */
final class CoincidenciaTerminos {

    private static final Pattern MARCAS = Pattern.compile("\\p{M}+");
    private static final Pattern NO_ALFANUM = Pattern.compile("[^a-z0-9]+");

    private CoincidenciaTerminos() {}

    static String normalizar(String texto) {
        if (texto == null) return "";
        String sinTildes = MARCAS.matcher(Normalizer.normalize(texto, Normalizer.Form.NFD)).replaceAll("");
        return NO_ALFANUM.matcher(sinTildes.toLowerCase(Locale.ROOT)).replaceAll(" ").trim();
    }

    /** Un término coincide al inicio de una palabra («vape» atrapa «vapeador», «armas» no atrapa «armario»). */
    static Optional<String> primerTermino(List<TerminoProhibido> terminos, String... textos) {
        String texto = " " + Arrays.stream(textos).map(CoincidenciaTerminos::normalizar)
            .collect(Collectors.joining(" ")) + " ";
        return terminos.stream().map(TerminoProhibido::getTermino).filter(t -> texto.contains(" " + t)).findFirst();
    }
}
