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
        String slug = base.replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (slug.length() <= MAX) return slug;
        return slug.substring(0, MAX).replaceAll("-$", "");
    }

    public static boolean esSeguro(String slug) {
        return slug != null && slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*");
    }
}
