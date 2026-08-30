package com.hotclick.service.catalogo;

import java.util.List;

/**
 * SQL de relevancia ILIKE: match solo con términos del usuario;
 * sinónimos suman boost en el ORDER BY sin abrir el WHERE.
 */
public final class ChatKeywordRankSql {

    private ChatKeywordRankSql() {}

    /** Preferir productos con foto, luego score de términos, luego boost de sinónimos. */
    public static String orderByRelevancia(int userTermCount, int synonymCount) {
        return " ORDER BY "
            + "CASE WHEN p.imagen_principal_url IS NOT NULL AND TRIM(p.imagen_principal_url) <> '' "
            + "THEN 0 ELSE 1 END, "
            + scoreExpr(userTermCount, 4, 3, 3, 1) + " DESC, "
            + (synonymCount > 0
                ? scoreExpr(synonymCount, 1, 1, 1, 0) + " DESC, "
                : "")
            + "p.id_producto DESC";
    }

    /**
     * Score por término: nombre×nW + tags×tW + categoría×cW + desc×dW.
     * Cada término aporta 4 params (nombre, tags, cat, desc).
     */
    public static String scoreExpr(int termCount, int nW, int tW, int cW, int dW) {
        if (termCount <= 0) return "0";
        StringBuilder sb = new StringBuilder("(");
        for (int i = 0; i < termCount; i++) {
            if (i > 0) sb.append(" + ");
            sb.append("(CASE WHEN LOWER(p.nombre_producto) LIKE ? THEN ").append(nW).append(" ELSE 0 END)")
              .append(" + (CASE WHEN LOWER(COALESCE(p.tags,'')) LIKE ? THEN ").append(tW).append(" ELSE 0 END)")
              .append(" + (CASE WHEN LOWER(COALESCE(c.nombre_categoria,'')) LIKE ? THEN ").append(cW).append(" ELSE 0 END)")
              .append(" + (CASE WHEN LOWER(COALESCE(p.descripcion_corta,'')) LIKE ? THEN ").append(dW).append(" ELSE 0 END)");
        }
        return sb.append(')').toString();
    }

    public static int paramsPorTerminoScore() {
        return 4;
    }

    public static void bindScoreTerminos(List<Object> params, List<String> terms) {
        if (terms == null) return;
        for (String term : terms) {
            String like = "%" + ChatSearchTerms.sanitizarLike(term) + "%";
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
        }
    }
}
