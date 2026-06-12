package com.hotclick.rag.service;

import com.hotclick.rag.dto.ProductoContexto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * Búsqueda de productos para el pipeline RAG.
 *
 * Estrategia con degradación en dos niveles:
 *   1. Búsqueda semántica (pgvector + Gemini text-embedding-004) — más precisa.
 *   2. Fallback a búsqueda por palabras clave (PostgreSQL ILIKE + unaccent) — sin dependencia de Gemini.
 *
 * El fallback se activa automáticamente si Gemini no está disponible (403, timeout, etc.).
 */
@Service
public class VectorSearchService {

    private static final Logger log = LoggerFactory.getLogger(VectorSearchService.class);

    private final EmbeddingService embeddingService;
    private final JdbcTemplate     jdbc;

    public VectorSearchService(EmbeddingService embeddingService, JdbcTemplate jdbc) {
        this.embeddingService = embeddingService;
        this.jdbc             = jdbc;
    }

    /**
     * Busca los {@code limit} productos más relevantes para {@code query}
     * dentro de la empresa {@code empresaId}, excluyendo artículos sin stock.
     *
     * Intenta búsqueda semántica primero; si Gemini falla cae a búsqueda por palabras clave.
     */
    public List<ProductoContexto> buscarSimilares(Long empresaId, String query, int limit) {
        // 1. Búsqueda semántica (embedding)
        try {
            float[] vector    = embeddingService.generarEmbedding(query);
            String  vectorStr = toVectorString(vector);

            List<ProductoContexto> resultados = jdbc.query("""
                SELECT p.id_producto,
                       p.nombre_producto,
                       p.sku,
                       p.precio_venta,
                       p.descripcion_corta,
                       p.imagen_principal_url,
                       (p.stock_actual - COALESCE(p.stock_reservado, 0)) AS stock_disponible
                FROM   hot_click_producto_embedding_tb e
                JOIN   hot_click_producto_tb p ON p.id_producto = e.fk_id_producto
                WHERE  e.fk_id_empresa = ?
                  AND  p.fk_id_estado      = 1
                  AND  p.visible_catalogo  = true
                  AND  p.vendido           = false
                  AND  (p.stock_actual - COALESCE(p.stock_reservado, 0)) > 0
                ORDER  BY e.embedding <-> ?::vector
                LIMIT  ?
                """,
                (rs, rowNum) -> mapProducto(rs),
                empresaId, vectorStr, limit
            );

            if (!resultados.isEmpty()) {
                return resultados;
            }
            // Sin embeddings generados aún → fallback keyword
            log.debug("[vector-search] Embedding OK pero sin filas en tabla — usando fallback keyword");

        } catch (Exception e) {
            log.warn("[vector-search] Gemini embedding falló empresa={}: {} — usando fallback por palabras clave",
                empresaId, e.getMessage());
        }

        // 2. Fallback: búsqueda por palabras clave (ILIKE multi-campo)
        return buscarPorKeywords(empresaId, query, limit);
    }

    /**
     * Búsqueda por palabras clave contra nombre, descripcion, marca y tags.
     * Cada palabra del query se evalúa por separado (AND lógico) para mayor precisión.
     * Si no hay matches multi-palabra, reintenta con solo la primera palabra.
     */
    private List<ProductoContexto> buscarPorKeywords(Long empresaId, String query, int limit) {
        try {
            // Normaliza: minúsculas, quita puntuación, toma palabras > 2 chars
            String[] palabras = query.toLowerCase()
                .replaceAll("[^a-záéíóúüñ0-9\\s]", " ")
                .trim()
                .split("\\s+");

            List<String> keywords = new java.util.ArrayList<>();
            for (String p : palabras) {
                if (p.length() > 2) keywords.add(p);
            }
            if (keywords.isEmpty() && palabras.length > 0) {
                keywords.add(palabras[0]); // al menos la primera palabra
            }
            if (keywords.isEmpty()) {
                return Collections.emptyList();
            }

            // Construye condición: cada keyword debe aparecer en alguno de los campos
            StringBuilder where = new StringBuilder();
            List<Object> params = new java.util.ArrayList<>();
            params.add(empresaId);

            for (String kw : keywords) {
                if (!where.isEmpty()) where.append(" AND ");
                String like = "%" + kw + "%";
                where.append("(LOWER(p.nombre_producto) LIKE ? OR LOWER(p.descripcion_corta) LIKE ? OR LOWER(p.marca) LIKE ? OR LOWER(p.tags) LIKE ?)");
                params.add(like); params.add(like); params.add(like); params.add(like);
            }
            params.add(limit);

            String sql = """
                SELECT p.id_producto,
                       p.nombre_producto,
                       p.sku,
                       p.precio_venta,
                       p.descripcion_corta,
                       p.imagen_principal_url,
                       (p.stock_actual - COALESCE(p.stock_reservado, 0)) AS stock_disponible
                FROM   hot_click_producto_tb p
                WHERE  p.fk_id_empresa   = ?
                  AND  p.fk_id_estado    = 1
                  AND  p.visible_catalogo = true
                  AND  p.vendido         = false
                  AND  (p.stock_actual - COALESCE(p.stock_reservado, 0)) > 0
                  AND  """ + where + """
                ORDER  BY p.nombre_producto
                LIMIT  ?
                """;

            List<ProductoContexto> resultados = jdbc.query(sql,
                (rs, rowNum) -> mapProducto(rs),
                params.toArray()
            );

            // Si el AND entre palabras no devolvió nada, reintenta con la primera keyword sola
            if (resultados.isEmpty() && keywords.size() > 1) {
                return buscarPorKeywords(empresaId, keywords.get(0), limit);
            }

            log.debug("[vector-search] Fallback keyword empresa={} query='{}' → {} resultados",
                empresaId, query, resultados.size());
            return resultados;

        } catch (Exception ex) {
            log.warn("[vector-search] Fallback keyword también falló empresa={}: {}", empresaId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private static ProductoContexto mapProducto(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ProductoContexto(
            rs.getLong("id_producto"),
            rs.getString("nombre_producto"),
            rs.getString("sku"),
            rs.getInt("precio_venta"),
            rs.getString("descripcion_corta"),
            rs.getString("imagen_principal_url"),
            rs.getInt("stock_disponible")
        );
    }

    /** Convierte float[] al formato de literal pgvector: [f1,f2,...,fn]. */
    private static String toVectorString(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(String.format("%.8f", vector[i]));
        }
        return sb.append(']').toString();
    }
}
