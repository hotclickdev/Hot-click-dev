package com.hotclick.seo;

import java.text.Normalizer;
import java.util.Locale;

/** Slug ASCII estable para URLs públicas (sectores, provincias). */
public final class SeoSlugs {

    private static final int MAX = 100;

    private SeoSlugs() {}

    public static String desde(String texto) {
        if (texto == null || texto.isBlank()) return "";
        String base = Normalizer.normalize(texto.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "");
        String slug = aGuiones(base);
        if (slug.length() <= MAX) return slug;
        return sinGuionFinal(slug.substring(0, MAX));
    }

    public static boolean esSeguro(String slug) {
        if (slug == null || slug.isEmpty()) return false;
        boolean guionPrevio = true;
        for (int i = 0; i < slug.length(); i++) {
            char c = slug.charAt(i);
            if (c == '-') {
                if (guionPrevio) return false;
                guionPrevio = true;
                continue;
            }
            if (!esLetraODigito(c)) return false;
            guionPrevio = false;
        }
        return !guionPrevio;
    }

    private static String aGuiones(String base) {
        StringBuilder out = new StringBuilder(base.length());
        boolean guion = false;
        for (int i = 0; i < base.length(); i++) {
            char c = base.charAt(i);
            if (esLetraODigito(c)) {
                out.append(c);
                guion = false;
            } else if (!guion && !out.isEmpty()) {
                out.append('-');
                guion = true;
            }
        }
        return sinGuionFinal(out.toString());
    }

    private static String sinGuionFinal(String slug) {
        if (slug.endsWith("-")) return slug.substring(0, slug.length() - 1);
        return slug;
    }

    private static boolean esLetraODigito(char c) {
        return (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');
    }
}
