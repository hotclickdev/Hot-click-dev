package com.hotclick.service.publicchat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PublicChatProductSearch {

    private static final Logger log = LoggerFactory.getLogger(PublicChatProductSearch.class);
    private static final int PAGE = 5;

    private final JdbcTemplate jdbc;

    public PublicChatProductSearch(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int getPageSize() {
        return PAGE;
    }

    public List<Map<String, Object>> buscarPopulares(Long empresaId, int offset) {
        String sql = """
            SELECT id_producto, nombre_producto, descripcion_corta,
                   precio_venta, precio_oferta, imagen_principal_url, sku, stock_actual
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ?
              AND fk_id_estado = 1
              AND visible_catalogo = TRUE
              AND vendido = FALSE
              AND stock_actual > 0
            ORDER BY destacado DESC, en_carrusel DESC, id_producto DESC
            LIMIT ? OFFSET ?
            """;
        return jdbc.queryForList(sql, empresaId, PAGE + 1, offset);
    }

    public List<Map<String, Object>> buscarEnOferta(Long empresaId, int offset) {
        String sql = """
            SELECT id_producto, nombre_producto, descripcion_corta,
                   precio_venta, precio_oferta, imagen_principal_url, sku, stock_actual
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ?
              AND fk_id_estado = 1
              AND visible_catalogo = TRUE
              AND vendido = FALSE
              AND stock_actual > 0
              AND en_oferta = TRUE
            ORDER BY id_producto DESC
            LIMIT ? OFFSET ?
            """;
        return jdbc.queryForList(sql, empresaId, PAGE + 1, offset);
    }

    public List<Map<String, Object>> buscarPorIds(Long empresaId, List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        String placeholders = ids.stream().map(id -> "?").collect(Collectors.joining(","));
        List<Object> params = new ArrayList<>();
        params.add(empresaId);
        params.addAll(ids);
        String sql = """
            SELECT id_producto, nombre_producto, descripcion_corta,
                   precio_venta, precio_oferta, imagen_principal_url, sku, stock_actual
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ?
              AND fk_id_estado = 1
              AND id_producto IN (%s)
            """.formatted(placeholders);
        return jdbc.queryForList(sql, params.toArray());
    }

    public List<Map<String, Object>> buscarProductos(Long empresaId, String tsQuery,
                                                     String raw, int offset,
                                                     Long maxBudget, Set<String> negations) {
        String priceFilter = maxBudget != null ? " AND precio_venta <= " + maxBudget : "";

        if (!tsQuery.isBlank()) {
            try {
                String sql = """
                    SELECT id_producto, nombre_producto, descripcion_corta,
                           precio_venta, precio_oferta, imagen_principal_url, sku, stock_actual,
                           ts_rank(search_vector, to_tsquery('spanish', ?)) AS rank
                    FROM hot_click_producto_tb
                    WHERE fk_id_empresa = ?
                      AND fk_id_estado = 1
                      AND visible_catalogo = TRUE
                      AND vendido = FALSE
                      AND stock_actual > 0
                      AND search_vector @@ to_tsquery('spanish', ?)
                    """ + priceFilter + """
                    ORDER BY rank DESC, id_producto DESC
                    LIMIT ? OFFSET ?
                    """;
                List<Map<String, Object>> r = jdbc.queryForList(sql, tsQuery, empresaId, tsQuery, PAGE + 1, offset);
                r = applyNegationFilter(r, negations);
                if (!r.isEmpty()) return r;
            } catch (Exception e) {
                log.debug("[Chat] tsvector query failed ({}), fallback to ILIKE", e.getMessage());
            }
        }

        List<String> terms = tsQuery.isBlank()
            ? List.of(raw.trim().toLowerCase())
            : Arrays.stream(tsQuery.split("\\s*\\|\\s*"))
                .map(String::trim).filter(s -> !s.isBlank()).toList();

        List<Object> params = new ArrayList<>();
        params.add(empresaId);
        StringBuilder conditions = new StringBuilder();
        for (int i = 0; i < terms.size(); i++) {
            String like = "%" + terms.get(i).toLowerCase() + "%";
            if (i > 0) conditions.append(" OR ");
            conditions.append("(LOWER(nombre_producto) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(descripcion_corta) LIKE ?)");
            params.add(like);
            params.add(like);
            params.add(like);
        }
        params.add(PAGE + 1);
        params.add(offset);

        String sql = """
            SELECT id_producto, nombre_producto, descripcion_corta,
                   precio_venta, precio_oferta, imagen_principal_url, sku, stock_actual
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ?
              AND fk_id_estado = 1
              AND visible_catalogo = TRUE
              AND vendido = FALSE
              AND stock_actual > 0
              AND (""" + conditions + ")" + priceFilter + """

            ORDER BY precio_venta ASC
            LIMIT ? OFFSET ?
            """;
        List<Map<String, Object>> r = jdbc.queryForList(sql, params.toArray());
        return applyNegationFilter(r, negations);
    }

    public List<Map<String, Object>> applyNegationFilter(List<Map<String, Object>> results,
                                                         Set<String> negations) {
        if (negations.isEmpty()) return results;
        return results.stream()
            .filter(p -> {
                String text = (String.valueOf(p.getOrDefault("nombre_producto", ""))
                    + " " + String.valueOf(p.getOrDefault("descripcion_corta", ""))).toLowerCase();
                return negations.stream().noneMatch(text::contains);
            })
            .collect(Collectors.toList());
    }
}
