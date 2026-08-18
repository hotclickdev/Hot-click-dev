package com.hotclick.service.publicchat;

import com.hotclick.service.catalogo.CatalogoChatSql;
import com.hotclick.service.catalogo.ChatProductoMatchSql;
import com.hotclick.service.catalogo.ChatSearchTerms;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PublicChatProductSearch {

    private static final Logger log = LoggerFactory.getLogger(PublicChatProductSearch.class);
    private static final int PAGE = 5;
    private static final String SELECT_FICHA = """
            SELECT p.id_producto, p.nombre_producto, p.descripcion_corta,
                   p.precio_venta, p.precio_oferta, p.imagen_principal_url, p.sku, p.stock_actual,
                   p.tags, c.nombre_categoria AS nombre_categoria
            """;

    private static final String SELECT_ASESOR = """
            SELECT p.id_producto, p.nombre_producto, p.descripcion_corta,
                   LEFT(COALESCE(p.descripcion_larga, ''), 2000) AS descripcion_larga,
                   p.precio_venta, p.precio_oferta, p.imagen_principal_url, p.sku, p.stock_actual,
                   p.tags, c.nombre_categoria AS nombre_categoria,
                   LEFT(COALESCE(p.especificaciones, ''), 1500) AS especificaciones,
                   LEFT(COALESCE(p.como_usar, ''), 800) AS como_usar,
                   p.garantia_dias
            """;

    private final JdbcTemplate jdbc;

    public PublicChatProductSearch(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int getPageSize() {
        return PAGE;
    }

    public List<Map<String, Object>> buscarPopulares(Long empresaId, boolean marketplace, int offset) {
        String sql = SELECT_FICHA
            + " FROM hot_click_producto_tb p"
            + CatalogoChatSql.joins(marketplace)
            + " WHERE " + CatalogoChatSql.whereVisible(marketplace, false)
            + " ORDER BY p.destacado DESC, p.en_carrusel DESC, p.id_producto DESC"
            + " LIMIT ? OFFSET ?";
        return queryConEmpresa(sql, empresaId, marketplace, PAGE + 1, offset);
    }

    public List<Map<String, Object>> buscarEnOferta(Long empresaId, boolean marketplace, int offset) {
        String sql = SELECT_FICHA
            + " FROM hot_click_producto_tb p"
            + CatalogoChatSql.joins(marketplace)
            + " WHERE " + CatalogoChatSql.whereVisible(marketplace, false)
            + " AND p.en_oferta = TRUE"
            + " ORDER BY p.id_producto DESC"
            + " LIMIT ? OFFSET ?";
        return queryConEmpresa(sql, empresaId, marketplace, PAGE + 1, offset);
    }

    public Map<String, Object> buscarFichaAsesor(Long empresaId, boolean marketplace, Long productoId) {
        if (productoId == null || productoId <= 0) return null;
        List<Object> params = new ArrayList<>();
        CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
        params.add(productoId);
        String sql = SELECT_ASESOR
            + " FROM hot_click_producto_tb p"
            + CatalogoChatSql.joins(marketplace)
            + " WHERE " + CatalogoChatSql.whereFichaAsesor(marketplace)
            + " AND p.id_producto = ?";
        List<Map<String, Object>> rows = jdbc.queryForList(sql, params.toArray());
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<Map<String, Object>> buscarPorIds(Long empresaId, boolean marketplace, List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        String placeholders = ids.stream().map(id -> "?").collect(Collectors.joining(","));
        List<Object> params = new ArrayList<>();
        CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
        params.addAll(ids);
        String sql = SELECT_FICHA
            + " FROM hot_click_producto_tb p"
            + CatalogoChatSql.joins(marketplace)
            + " WHERE " + CatalogoChatSql.filtroEmpresa(marketplace)
            + " AND p.fk_id_estado = 1"
            + " AND p.id_producto IN (" + placeholders + ")";
        return jdbc.queryForList(sql, params.toArray());
    }

    public List<Map<String, Object>> buscarProductos(Long empresaId, boolean marketplace, String tsQuery,
                                                     String raw, int offset,
                                                     Long maxBudget, Set<String> negations) {
        List<Map<String, Object>> porTs = buscarPorTsvector(empresaId, marketplace, tsQuery, offset, maxBudget);
        List<Map<String, Object>> filtrados = applyNegationFilter(porTs, negations);
        if (!filtrados.isEmpty()) return filtrados;

        List<String> terms = ChatSearchTerms.fromTsQuery(tsQuery);
        if (terms.isEmpty() && raw != null && !raw.isBlank()) {
            terms = List.of(raw.trim().toLowerCase());
        }
        List<Map<String, Object>> porLike = buscarPorIlike(empresaId, marketplace, terms, offset, maxBudget);
        return applyNegationFilter(porLike, negations);
    }

    public List<Map<String, Object>> applyNegationFilter(List<Map<String, Object>> results,
                                                         Set<String> negations) {
        if (negations == null || negations.isEmpty()) return results;
        return results.stream()
            .filter(p -> {
                String text = (String.valueOf(p.getOrDefault("nombre_producto", ""))
                    + " " + String.valueOf(p.getOrDefault("descripcion_corta", ""))
                    + " " + String.valueOf(p.getOrDefault("tags", ""))).toLowerCase();
                return negations.stream().noneMatch(text::contains);
            })
            .toList();
    }

    private List<Map<String, Object>> buscarPorTsvector(Long empresaId, boolean marketplace,
                                                        String tsQuery, int offset, Long maxBudget) {
        if (tsQuery == null || tsQuery.isBlank()) return List.of();
        try {
            List<Object> params = new ArrayList<>();
            params.add(tsQuery);
            CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
            params.add(tsQuery);
            String price = appendPrecio(params, maxBudget);
            params.add(PAGE + 1);
            params.add(offset);
            String sql = SELECT_FICHA
                + ", ts_rank(p.search_vector, to_tsquery('spanish', ?)) AS rank"
                + " FROM hot_click_producto_tb p"
                + CatalogoChatSql.joins(marketplace)
                + " WHERE " + CatalogoChatSql.whereVisible(marketplace, false)
                + " AND p.search_vector @@ to_tsquery('spanish', ?)"
                + price
                + " ORDER BY rank DESC, p.id_producto DESC"
                + " LIMIT ? OFFSET ?";
            return jdbc.queryForList(sql, params.toArray());
        } catch (Exception e) {
            log.debug("[Chat] tsvector query failed ({}), fallback to ILIKE", e.getMessage());
            return List.of();
        }
    }

    private List<Map<String, Object>> buscarPorIlike(Long empresaId, boolean marketplace,
                                                     List<String> terms, int offset, Long maxBudget) {
        if (terms.isEmpty()) return List.of();
        List<Object> params = new ArrayList<>();
        CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
        for (String term : terms) {
            ChatProductoMatchSql.bindTermino(params, term);
        }
        String price = appendPrecio(params, maxBudget);
        params.add(PAGE + 1);
        params.add(offset);
        String sql = SELECT_FICHA
            + " FROM hot_click_producto_tb p"
            + CatalogoChatSql.joins(marketplace)
            + " WHERE " + CatalogoChatSql.whereVisible(marketplace, false)
            + " AND (" + ChatProductoMatchSql.orDeTerminos(terms.size()) + ")"
            + price
            + " ORDER BY p.precio_venta ASC"
            + " LIMIT ? OFFSET ?";
        return jdbc.queryForList(sql, params.toArray());
    }

    private static String appendPrecio(List<Object> params, Long maxBudget) {
        if (maxBudget == null) return "";
        params.add(maxBudget);
        return " AND p.precio_venta <= ?";
    }

    private List<Map<String, Object>> queryConEmpresa(String sql, Long empresaId, boolean marketplace,
                                                      int limit, int offset) {
        List<Object> params = new ArrayList<>();
        CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
        params.add(limit);
        params.add(offset);
        return jdbc.queryForList(sql, params.toArray());
    }
}
