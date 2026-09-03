package com.hotclick.service.publicchat;

import com.hotclick.service.catalogo.CatalogoChatSql;
import com.hotclick.service.catalogo.ChatKeywordRankSql;
import com.hotclick.service.catalogo.ChatPrecioPersonalizado;
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
                   LEFT(COALESCE(p.descripcion_larga, ''), 600) AS descripcion_larga,
                   p.precio_venta, p.precio_oferta, p.imagen_principal_url, p.sku,
                   p.stock_actual,
                   (p.stock_actual - COALESCE(p.stock_reservado, 0)) AS stock_disponible,
                   p.tags, c.nombre_categoria AS nombre_categoria,
                   LEFT(COALESCE(p.especificaciones, ''), 600) AS especificaciones,
                   LEFT(COALESCE(p.como_usar, ''), 400) AS como_usar
            """ + ChatPrecioPersonalizado.fragmentoSelectSql();

    private static final String SELECT_ASESOR = """
            SELECT p.id_producto, p.nombre_producto, p.descripcion_corta,
                   LEFT(COALESCE(p.descripcion_larga, ''), 2000) AS descripcion_larga,
                   p.precio_venta, p.precio_oferta, p.imagen_principal_url, p.sku,
                   p.stock_actual,
                   (p.stock_actual - COALESCE(p.stock_reservado, 0)) AS stock_disponible,
                   p.tags, c.nombre_categoria AS nombre_categoria,
                   LEFT(COALESCE(p.especificaciones, ''), 1500) AS especificaciones,
                   LEFT(COALESCE(p.como_usar, ''), 800) AS como_usar,
                   p.garantia_dias
            """ + ChatPrecioPersonalizado.fragmentoSelectSql();

    private final JdbcTemplate jdbc;
    private final PublicChatIntentHelper intentHelper;

    public PublicChatProductSearch(JdbcTemplate jdbc, PublicChatIntentHelper intentHelper) {
        this.jdbc = jdbc;
        this.intentHelper = intentHelper;
    }

    public int getPageSize() {
        return PAGE;
    }

    public List<Map<String, Object>> buscarPopulares(Long empresaId, boolean marketplace, int offset) {
        String sql = SELECT_FICHA
            + " FROM hot_click_producto_tb p"
            + CatalogoChatSql.joins(marketplace)
            + " WHERE " + CatalogoChatSql.whereVisible(marketplace, false)
            + " ORDER BY "
            + "CASE WHEN p.imagen_principal_url IS NOT NULL AND TRIM(p.imagen_principal_url) <> '' THEN 0 ELSE 1 END, "
            + "p.destacado DESC, p.en_carrusel DESC, p.id_producto DESC"
            + " LIMIT ? OFFSET ?";
        return queryConEmpresa(sql, empresaId, marketplace, PAGE + 1, offset);
    }

    public List<Map<String, Object>> buscarEnOferta(Long empresaId, boolean marketplace, int offset) {
        String sql = SELECT_FICHA
            + " FROM hot_click_producto_tb p"
            + CatalogoChatSql.joins(marketplace)
            + " WHERE " + CatalogoChatSql.whereVisible(marketplace, false)
            + " AND p.en_oferta = TRUE"
            + " ORDER BY "
            + "CASE WHEN p.imagen_principal_url IS NOT NULL AND TRIM(p.imagen_principal_url) <> '' THEN 0 ELSE 1 END, "
            + "p.id_producto DESC"
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
        return buscarProductos(empresaId, marketplace, tsQuery, raw, offset, maxBudget, negations, false);
    }

    public List<Map<String, Object>> buscarProductos(Long empresaId, boolean marketplace, String tsQuery,
                                                     String raw, int offset,
                                                     Long maxBudget, Set<String> negations,
                                                     boolean preferirPersonalizado) {
        List<String> userTerms = resolverTerminosUsuario(tsQuery, raw);
        List<String> synonymBoost = intentHelper.expandSynonyms(userTerms);

        List<Map<String, Object>> porTs = buscarPorTsvector(
            empresaId, marketplace, ChatSearchTerms.websearchQuery(userTerms), offset, maxBudget,
            synonymBoost, preferirPersonalizado);
        List<Map<String, Object>> filtrados = applyNegationFilter(porTs, negations);
        if (!filtrados.isEmpty()) return filtrados;

        List<Map<String, Object>> porLike = buscarPorIlike(
            empresaId, marketplace, userTerms, synonymBoost, offset, maxBudget, preferirPersonalizado);
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

    private List<String> resolverTerminosUsuario(String tsQuery, String raw) {
        List<String> fromTs = ChatSearchTerms.fromTsQuery(tsQuery);
        if (!fromTs.isEmpty()) return fromTs;
        if (raw != null && !raw.isBlank()) return intentHelper.userTerms(raw);
        return List.of();
    }

    private List<Map<String, Object>> buscarPorTsvector(Long empresaId, boolean marketplace,
                                                        String webQuery, int offset, Long maxBudget,
                                                        List<String> synonymBoost,
                                                        boolean preferirPersonalizado) {
        if (webQuery == null || webQuery.isBlank()) return List.of();
        try {
            List<Object> params = new ArrayList<>();
            params.add(webQuery);
            CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
            params.add(webQuery);
            String price = appendPrecio(params, maxBudget);
            ChatKeywordRankSql.bindScoreTerminos(params, synonymBoost);
            params.add(PAGE + 1);
            params.add(offset);
            int synCount = synonymBoost == null ? 0 : synonymBoost.size();
            String boostPers = ChatPrecioPersonalizado.orderBoostPersonalizado(preferirPersonalizado);
            String sql = SELECT_FICHA
                + ", ts_rank(p.search_vector, websearch_to_tsquery('spanish', ?)) AS rank"
                + " FROM hot_click_producto_tb p"
                + CatalogoChatSql.joins(marketplace)
                + " WHERE " + CatalogoChatSql.whereVisible(marketplace, false)
                + " AND p.search_vector @@ websearch_to_tsquery('spanish', ?)"
                + price
                + " ORDER BY "
                + boostPers
                + "CASE WHEN p.imagen_principal_url IS NOT NULL AND TRIM(p.imagen_principal_url) <> '' THEN 0 ELSE 1 END, "
                + "rank DESC"
                + (synCount > 0 ? ", " + ChatKeywordRankSql.scoreExpr(synCount, 1, 1, 1, 0) + " DESC" : "")
                + ", p.id_producto DESC"
                + " LIMIT ? OFFSET ?";
            return jdbc.queryForList(sql, params.toArray());
        } catch (Exception e) {
            log.debug("[Chat] tsvector query failed ({}), fallback to ILIKE", e.getMessage());
            return List.of();
        }
    }

    private List<Map<String, Object>> buscarPorIlike(Long empresaId, boolean marketplace,
                                                     List<String> userTerms, List<String> synonymBoost,
                                                     int offset, Long maxBudget,
                                                     boolean preferirPersonalizado) {
        if (userTerms == null || userTerms.isEmpty()) return List.of();
        List<Object> params = new ArrayList<>();
        CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
        for (String term : userTerms) {
            ChatProductoMatchSql.bindTermino(params, term);
        }
        String price = appendPrecio(params, maxBudget);
        ChatKeywordRankSql.bindScoreTerminos(params, userTerms);
        ChatKeywordRankSql.bindScoreTerminos(params, synonymBoost);
        params.add(PAGE + 1);
        params.add(offset);
        int synCount = synonymBoost == null ? 0 : synonymBoost.size();
        String boostPers = ChatPrecioPersonalizado.orderBoostPersonalizado(preferirPersonalizado);
        String order = preferirPersonalizado
            ? " ORDER BY " + boostPers
                + "CASE WHEN p.imagen_principal_url IS NOT NULL AND TRIM(p.imagen_principal_url) <> '' "
                + "THEN 0 ELSE 1 END, "
                + ChatKeywordRankSql.scoreExpr(userTerms.size(), 4, 3, 3, 1) + " DESC, "
                + (synCount > 0 ? ChatKeywordRankSql.scoreExpr(synCount, 1, 1, 1, 0) + " DESC, " : "")
                + "p.id_producto DESC"
            : ChatKeywordRankSql.orderByRelevancia(userTerms.size(), synCount);
        String sql = SELECT_FICHA
            + " FROM hot_click_producto_tb p"
            + CatalogoChatSql.joins(marketplace)
            + " WHERE " + CatalogoChatSql.whereVisible(marketplace, false)
            + " AND (" + ChatProductoMatchSql.orDeTerminos(userTerms.size()) + ")"
            + price
            + order
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
