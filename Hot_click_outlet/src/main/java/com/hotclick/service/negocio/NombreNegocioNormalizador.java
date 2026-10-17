package com.hotclick.service.negocio;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Nombre de negocio normalizado: sin tildes, minúsculas y espacios colapsados.
 * «Café  La Ñapa» y «cafe la ñapa» chocan. La ñ se conserva (es otra letra en español).
 */
public final class NombreNegocioNormalizador {

    private NombreNegocioNormalizador() {}

    public static String normalizar(String nombre) {
        if (nombre == null) return "";
        String s = nombre.trim().toLowerCase(Locale.ROOT).replace('ñ', '\u0001');
        s = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return s.replace('\u0001', 'ñ').replaceAll("\\s+", " ");
    }
}
