package com.hotclick.rag.service;

import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.service.catalogo.CatalogoChatSql;
import com.hotclick.service.catalogo.ChatKeywordRankSql;
import com.hotclick.service.catalogo.ChatProductoMatchSql;
import com.hotclick.service.catalogo.ChatRankingConstants;
import com.hotclick.service.catalogo.ChatSearchTerms;
import com.hotclick.service.publicchat.PublicChatIntentHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Búsqueda de productos para el pipeline RAG.
 *
 * Estrategia:
 *   1. Embedding (pgvector coseno) con umbral {@link ChatRankingConstants#CHAT_DISTANCIA_MAXIMA}.
 *   2. Keyword (tsvector / ILIKE) — mismos términos de usuario que el chat público.
 *   3. Fusión RRF si ambas listas tienen resultados.
 */
@Service
public class VectorSearchService {

    private static final Logger log = LoggerFactory.getLogger(VectorSearchService.class);

    private static final String SELECT_FICHA = """
        SELECT p.id_producto,
               p.nombre_producto,
               p.sku,
               p.precio_venta,
               p.descripcion_corta,
               p.imagen_principal_url,
               (p.stock_actual - COALESCE(p.stock_reservado, 0)) AS stock_disponible,
               p.tags,
               c.nombre_categoria AS nombre_categoria,
               LEFT(COALESCE(p.especificaciones, ''), 280) AS especificaciones,
               LEFT(COALESCE(p.como_usar, ''), 160) AS como_usar
        """;

    private static final String SELECT_ASESOR = """
        SELECT p.id_producto,
               p.nombre_producto,
               p.sku,
               p.precio_venta,
               LEFT(COALESCE(p.descripcion_corta, ''), 400) AS descripcion_corta,
               p.imagen_principal_url,
               (p.stock_actual - COALESCE(p.stock_reservado, 0)) AS stock_disponible,
               p.tags,
               c.nombre_categoria AS nombre_categoria,
               LEFT(COALESCE(p.especificaciones, ''), 1500) AS especificaciones,
               LEFT(COALESCE(p.como_usar, ''), 800) AS como_usar
        """;

    private final EmbeddingService embeddingService;
    private final JdbcTemplate jdbc;
    private final PublicChatIntentHelper intentHelper;

    public VectorSearchService(EmbeddingService embeddingService, JdbcTemplate jdbc,
                               PublicChatIntentHelper intentHelper) {
        this.embeddingService = embeddingService;
        this.jdbc = jdbc;
        this.intentHelper = intentHelper;
    }

    public List<ProductoContexto> buscarSimilares(Long empresaId, String query, int limit) {
        return buscarSimilares(empresaId, query, limit, false);
    }

    public List<ProductoContexto> buscarSimilares(Long empresaId, String query, int limit,
                                                  boolean marketplace) {
        List<ProductoContexto> semanticos = buscarPorEmbedding(empresaId, query, limit, marketplace);
        List<ProductoContexto> keywords = buscarPorKeywords(empresaId, query, limit, marketplace);
        if (semanticos.isEmpty()) return keywords;
        if (keywords.isEmpty()) return semanticos;
        return fusionRrf(semanticos, keywords, limit);
    }

    private List<ProductoContexto> buscarPorEmbedding(Long empresaId, String query, int limit,
                                                      boolean marketplace) {
        try {
            float[] vector = embeddingService.generarEmbedding(query);
            String vectorStr = toVectorString(vector);

            List<Object> params = new ArrayList<>();
            CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
            params.add(vectorStr); // SELECT distancia
            params.add(vectorStr); // WHERE distancia
            params.add(ChatRankingConstants.CHAT_DISTANCIA_MAXIMA);
            params.add(vectorStr); // ORDER BY
            params.add(limit);

            String sql = SELECT_FICHA
                + ", (emb.embedding <=> ?::vector) AS distancia"
                + " FROM hot_click_producto_embedding_tb emb"
                + " JOIN hot_click_producto_tb p ON p.id_producto = emb.fk_id_producto"
                + CatalogoChatSql.joins(marketplace)
                + " WHERE " + CatalogoChatSql.whereVisible(marketplace, true)
                + " AND (emb.embedding <=> ?::vector) <= ?"
                + " ORDER BY "
                + "CASE WHEN p.imagen_principal_url IS NOT NULL AND TRIM(p.imagen_principal_url) <> '' THEN 0 ELSE 1 END, "
                + "emb.embedding <=> ?::vector"
                + " LIMIT ?";

            List<ProductoContexto> resultados = jdbc.query(sql, (rs, rowNum) -> mapProducto(rs), params.toArray());
            if (!resultados.isEmpty()) return resultados;
            log.debug("[vector-search] Embedding OK pero sin filas bajo umbral — fallback keyword");
        } catch (Exception e) {
            log.warn("[vector-search] Embedding falló empresa={}: {} — usando fallback por palabras clave",
                empresaId, e.getMessage());
        }
        return List.of();
    }

    private List<ProductoContexto> buscarPorKeywords(Long empresaId, String query, int limit,
                                                     boolean marketplace) {
        try {
            List<String> userTerms = intentHelper.userTerms(query);
            if (userTerms.isEmpty()) return Collections.emptyList();
            List<String> synonymBoost = intentHelper.expandSynonyms(userTerms);

            List<ProductoContexto> porTs = buscarPorTsvector(
                empresaId, marketplace, ChatSearchTerms.websearchQuery(userTerms), limit, synonymBoost);
            if (!porTs.isEmpty()) return porTs;

            List<Object> params = new ArrayList<>();
            CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
            for (String term : userTerms) {
                ChatProductoMatchSql.bindTermino(params, term);
            }
            ChatKeywordRankSql.bindScoreTerminos(params, userTerms);
            ChatKeywordRankSql.bindScoreTerminos(params, synonymBoost);
            params.add(limit);

            String sql = SELECT_FICHA
                + " FROM hot_click_producto_tb p"
                + CatalogoChatSql.joins(marketplace)
                + " WHERE " + CatalogoChatSql.whereVisible(marketplace, true)
                + " AND (" + ChatProductoMatchSql.orDeTerminos(userTerms.size()) + ")"
                + ChatKeywordRankSql.orderByRelevancia(userTerms.size(), synonymBoost.size())
                + " LIMIT ?";

            List<ProductoContexto> resultados = jdbc.query(sql, (rs, rowNum) -> mapProducto(rs), params.toArray());
            log.debug("[vector-search] Fallback keyword empresa={} marketplace={} query='{}' → {} resultados",
                empresaId, marketplace, query, resultados.size());
            return resultados;
        } catch (Exception ex) {
            log.warn("[vector-search] Fallback keyword también falló empresa={}: {}", empresaId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<ProductoContexto> buscarPorTsvector(Long empresaId, boolean marketplace,
                                                     String webQuery, int limit,
                                                     List<String> synonymBoost) {
        if (webQuery == null || webQuery.isBlank()) return List.of();
        try {
            List<Object> params = new ArrayList<>();
            params.add(webQuery);
            CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
            params.add(webQuery);
            ChatKeywordRankSql.bindScoreTerminos(params, synonymBoost);
            params.add(limit);
            int synCount = synonymBoost == null ? 0 : synonymBoost.size();
            String sql = SELECT_FICHA
                + ", ts_rank(p.search_vector, websearch_to_tsquery('spanish', ?)) AS rank"
                + " FROM hot_click_producto_tb p"
                + CatalogoChatSql.joins(marketplace)
                + " WHERE " + CatalogoChatSql.whereVisible(marketplace, true)
                + " AND p.search_vector @@ websearch_to_tsquery('spanish', ?)"
                + " ORDER BY "
                + "CASE WHEN p.imagen_principal_url IS NOT NULL AND TRIM(p.imagen_principal_url) <> '' THEN 0 ELSE 1 END, "
                + "rank DESC"
                + (synCount > 0 ? ", " + ChatKeywordRankSql.scoreExpr(synCount, 1, 1, 1, 0) + " DESC" : "")
                + ", p.id_producto DESC"
                + " LIMIT ?";
            return jdbc.query(sql, (rs, rowNum) -> mapProducto(rs), params.toArray());
        } catch (Exception e) {
            log.debug("[vector-search] tsvector falló: {}", e.getMessage());
            return List.of();
        }
    }

    /** Reciprocal Rank Fusion de dos listas ordenadas. */
    static List<ProductoContexto> fusionRrf(List<ProductoContexto> a, List<ProductoContexto> b, int limit) {
        Map<Long, Double> scores = new LinkedHashMap<>();
        Map<Long, ProductoContexto> byId = new LinkedHashMap<>();
        addRrfScores(a, scores, byId);
        addRrfScores(b, scores, byId);
        return scores.entrySet().stream()
            .sorted(Map.Entry.<Long, Double>comparingByValue().reversed())
            .limit(limit)
            .map(e -> byId.get(e.getKey()))
            .toList();
    }

    private static void addRrfScores(List<ProductoContexto> list,
                                     Map<Long, Double> scores,
                                     Map<Long, ProductoContexto> byId) {
        int k = ChatRankingConstants.RRF_K;
        for (int i = 0; i < list.size(); i++) {
            ProductoContexto p = list.get(i);
            if (p.id() == null) continue;
            byId.putIfAbsent(p.id(), p);
            scores.merge(p.id(), 1.0 / (k + i + 1), Double::sum);
        }
    }

    public List<ProductoContexto> buscarPorId(Long empresaId, Long productoId, boolean marketplace) {
        if (productoId == null || productoId <= 0) return List.of();
        List<Object> params = new ArrayList<>();
        CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
        params.add(productoId);
        String sql = SELECT_ASESOR
            + " FROM hot_click_producto_tb p"
            + CatalogoChatSql.joins(marketplace)
            + " WHERE " + CatalogoChatSql.whereFichaAsesor(marketplace)
            + " AND p.id_producto = ?";
        return jdbc.query(sql, (rs, rowNum) -> mapProducto(rs), params.toArray());
    }

    private static ProductoContexto mapProducto(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ProductoContexto(
            rs.getLong("id_producto"),
            rs.getString("nombre_producto"),
            rs.getString("sku"),
            rs.getInt("precio_venta"),
            rs.getString("descripcion_corta"),
            rs.getString("imagen_principal_url"),
            rs.getInt("stock_disponible"),
            rs.getString("tags"),
            rs.getString("nombre_categoria"),
            rs.getString("especificaciones"),
            rs.getString("como_usar")
        );
    }

    static String toVectorString(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(String.format("%.8f", vector[i]));
        }
        return sb.append(']').toString();
    }
}
