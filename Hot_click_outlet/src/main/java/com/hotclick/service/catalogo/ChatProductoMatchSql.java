package com.hotclick.service.catalogo;

import java.util.Collections;
import java.util.List;

/**
 * Un término matchea si aparece en ficha, tags o categoría — no exige que
 * todas las palabras del mensaje coincidan (el AND rompía "quiero ver productos para sala").
 */
public final class ChatProductoMatchSql {

    public static final int PARAMS_POR_TERMINO = 8;

    static final String CAMPO_MATCH = "("
        + "LOWER(p.nombre_producto) LIKE ? OR LOWER(COALESCE(p.tags,'')) LIKE ? "
        + "OR LOWER(COALESCE(p.descripcion_corta,'')) LIKE ? "
        + "OR LOWER(COALESCE(p.descripcion_larga,'')) LIKE ? "
        + "OR LOWER(COALESCE(p.especificaciones,'')) LIKE ? "
        + "OR LOWER(COALESCE(p.como_usar,'')) LIKE ? "
        + "OR LOWER(COALESCE(c.nombre_categoria,'')) LIKE ? "
        + "OR LOWER(COALESCE(p.marca,'')) LIKE ?"
        + ")";

    private ChatProductoMatchSql() {}

    public static String orDeTerminos(int cantidad) {
        if (cantidad <= 0) return "FALSE";
        return String.join(" OR ", Collections.nCopies(cantidad, CAMPO_MATCH));
    }

    public static void bindTermino(List<Object> params, String termino) {
        String like = "%" + ChatSearchTerms.sanitizarLike(termino) + "%";
        for (int i = 0; i < PARAMS_POR_TERMINO; i++) {
            params.add(like);
        }
    }
}
