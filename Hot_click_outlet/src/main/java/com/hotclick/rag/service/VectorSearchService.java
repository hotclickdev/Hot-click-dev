package com.hotclick.rag.service;

import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.service.catalogo.CatalogoChatSql;
import com.hotclick.service.catalogo.ChatProductoMatchSql;
import com.hotclick.service.catalogo.ChatSearchTerms;
import com.hotclick.service.publicchat.PublicChatIntentHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Búsqueda de productos para el pipeline RAG.
 *
 * Estrategia con degradación en dos niveles:
 *   1. Búsqueda semántica (pgvector + Voyage) — más precisa.
 *   2. Fallback a palabras clave (ILIKE OR + sinónimos del chat público).
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
        if (!semanticos.isEmpty()) return semanticos;
        return buscarPorKeywords(empresaId, query, limit, marketplace);
    }

    private List<ProductoContexto> buscarPorEmbedding(Long empresaId, String query, int limit,
                                                      boolean marketplace) {
        try {
            float[] vector = embeddingService.generarEmbedding(query);
            String vectorStr = toVectorString(vector);

            List<Object> params = new ArrayList<>();
            CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
            params.add(vectorStr);
            params.add(limit);

            String sql = SELECT_FICHA
                + " FROM hot_click_producto_embedding_tb emb"
                + " JOIN hot_click_producto_tb p ON p.id_producto = emb.fk_id_producto"
                + CatalogoChatSql.joins(marketplace)
                + " WHERE " + CatalogoChatSql.whereVisible(marketplace, true)
                + " ORDER BY emb.embedding <-> ?::vector"
                + " LIMIT ?";

            List<ProductoContexto> resultados = jdbc.query(sql, (rs, rowNum) -> mapProducto(rs), params.toArray());
            if (!resultados.isEmpty()) return resultados;
            log.debug("[vector-search] Embedding OK pero sin filas — usando fallback keyword");
        } catch (Exception e) {
            log.warn("[vector-search] Embedding falló empresa={}: {} — usando fallback por palabras clave",
                empresaId, e.getMessage());
        }
        return List.of();
    }

    private List<ProductoContexto> buscarPorKeywords(Long empresaId, String query, int limit,
                                                     boolean marketplace) {
        try {
            List<String> terms = ChatSearchTerms.fromTsQuery(intentHelper.buildTsQuery(query));
            if (terms.isEmpty()) return Collections.emptyList();

            List<Object> params = new ArrayList<>();
            CatalogoChatSql.bindEmpresaSiTenant(params, empresaId, marketplace);
            for (String term : terms) {
                ChatProductoMatchSql.bindTermino(params, term);
            }
            params.add(limit);

            String sql = SELECT_FICHA
                + " FROM hot_click_producto_tb p"
                + CatalogoChatSql.joins(marketplace)
                + " WHERE " + CatalogoChatSql.whereVisible(marketplace, true)
                + " AND (" + ChatProductoMatchSql.orDeTerminos(terms.size()) + ")"
                + " ORDER BY p.nombre_producto"
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
