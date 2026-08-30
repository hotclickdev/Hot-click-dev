package com.hotclick.service.catalogo;

import java.util.Arrays;
import java.util.List;

/** Parte el tsquery OR (`sala | living | sofa`) en términos para ILIKE. */
public final class ChatSearchTerms {

    private ChatSearchTerms() {}

    public static List<String> fromTsQuery(String tsQuery) {
        if (tsQuery == null || tsQuery.isBlank()) return List.of();
        return Arrays.stream(tsQuery.split("\\s*\\|\\s*"))
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .toList();
    }

    public static String sanitizarLike(String termino) {
        return quitarComodinesLike(termino).toLowerCase();
    }

    /** Quita % y _ para que el usuario no amplíe un LIKE parametrizado. */
    public static String quitarComodinesLike(String termino) {
        if (termino == null) return "";
        return termino.replace("%", "").replace("_", "").trim();
    }
}
