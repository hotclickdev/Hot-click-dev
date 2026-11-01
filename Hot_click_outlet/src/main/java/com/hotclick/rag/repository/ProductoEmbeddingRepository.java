package com.hotclick.rag.repository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Duration;
import java.util.List;
import java.util.function.LongSupplier;

/**
 * Acceso a datos para hot_click_producto_embedding_tb.
 *
 * Usa JdbcTemplate directamente porque el tipo vector de pgvector no es compatible
 * con JPA/Hibernate sin la extensión hibernate-vector (no incluida en el proyecto).
 * Los vectores se pasan como strings con casting explícito a ::vector en SQL,
 * que PostgreSQL acepta nativamente.
 */
@Repository
public class ProductoEmbeddingRepository {

    /** Versión del modelo activa. Usada en upsert y en la query de detección de embeddings obsoletos. */
    public static final String CURRENT_MODEL = "voyage-3-lite";

    private static final Logger log = LoggerFactory.getLogger(ProductoEmbeddingRepository.class);

    static final String TABLA = "hot_click_producto_embedding_tb";

    /** Si la tabla no existe se vuelve a preguntar cada tanto (por si se instala pgvector y se migra). */
    static final Duration REINTENTO_SI_NO_EXISTE = Duration.ofMinutes(5);
    /** Si existe se confía en el resultado un buen rato: la tabla no desaparece sola. */
    static final Duration REVALIDAR_SI_EXISTE = Duration.ofMinutes(30);

    private final JdbcTemplate jdbc;

    private LongSupplier relojNanos = System::nanoTime;
    private volatile Boolean tablaExiste;
    private volatile long verificadaEnNanos;

    public ProductoEmbeddingRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Solo para tests: reloj controlable. */
    void setRelojNanos(LongSupplier relojNanos) {
        this.relojNanos = relojNanos;
    }

    // ── Disponibilidad de la tabla ────────────────────────────────────────────

    /**
     * Indica si {@value #TABLA} existe. Sin la tabla (típico en dev con una imagen de Postgres
     * sin pgvector) no tiene sentido llamar a Voyage: la consulta o el upsert fallarían igual.
     *
     * <p>El resultado se cachea ({@link #REINTENTO_SI_NO_EXISTE} si falta,
     * {@link #REVALIDAR_SI_EXISTE} si existe). La verificación usa information_schema, que
     * funciona igual en Postgres y en H2. Si la verificación misma falla (BD caída) se asume
     * que existe y no se cachea: el comportamiento es el de siempre. El log no lleva PII.
     */
    public boolean tablaDisponible() {
        Boolean cache = tablaExiste;
        long ahora = relojNanos.getAsLong();
        if (cache != null) {
            Duration ttl = cache ? REVALIDAR_SI_EXISTE : REINTENTO_SI_NO_EXISTE;
            if (ahora - verificadaEnNanos < ttl.toNanos()) return cache;
        }
        boolean existe;
        try {
            Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE LOWER(table_name) = ?",
                Integer.class, TABLA);
            existe = n != null && n > 0;
        } catch (RuntimeException e) {
            log.debug("[embedding] No se pudo verificar la tabla ({}) — se asume disponible",
                e.getClass().getSimpleName());
            return true;
        }
        if (cache == null || cache != existe) {
            if (existe) {
                log.info("[embedding] Tabla {} disponible — búsqueda semántica e indexación activas", TABLA);
            } else {
                log.info("[embedding] Tabla {} no existe (¿falta pgvector o la migración V62?) — "
                    + "búsqueda semántica e indexación desactivadas, se reintenta en {} min",
                    TABLA, REINTENTO_SI_NO_EXISTE.toMinutes());
            }
        }
        tablaExiste = existe;
        verificadaEnNanos = ahora;
        return existe;
    }

    // ── Escritura ─────────────────────────────────────────────────────────────

    /**
     * Inserta o actualiza el embedding de un producto (upsert por fk_id_producto).
     * El WHERE en DO UPDATE garantiza que no se escriba si ni el texto ni el modelo
     * cambiaron — evita actualizar actualizado_en innecesariamente.
     */
    public void upsertEmbedding(Long productoId, Long empresaId,
                                float[] vector, String textoIndexado) {
        String vectorStr = toVectorString(vector);
        jdbc.update("""
            INSERT INTO hot_click_producto_embedding_tb
                (fk_id_producto, fk_id_empresa, embedding, texto_indexado, modelo_version,
                 creado_en, actualizado_en)
            VALUES (?, ?, ?::vector, ?, ?, NOW(), NOW())
            ON CONFLICT (fk_id_producto) DO UPDATE SET
                fk_id_empresa   = EXCLUDED.fk_id_empresa,
                embedding       = EXCLUDED.embedding,
                texto_indexado  = EXCLUDED.texto_indexado,
                modelo_version  = EXCLUDED.modelo_version,
                actualizado_en  = NOW()
            WHERE hot_click_producto_embedding_tb.texto_indexado  != EXCLUDED.texto_indexado
               OR hot_click_producto_embedding_tb.modelo_version  != EXCLUDED.modelo_version
            """,
            productoId, empresaId, vectorStr, textoIndexado, CURRENT_MODEL
        );
    }

    // ── Lectura ───────────────────────────────────────────────────────────────

    /**
     * Retorna hasta {@code limit} productos que necesitan (re)indexación:
     * <ul>
     *   <li>Sin embedding registrado (LEFT JOIN NULL).</li>
     *   <li>Con modelo_version distinto al actual (migración de modelo).</li>
     * </ul>
     * Excluye productos sin empresa (single-tenant legacy) y no visibles en catálogo.
     * ORDER BY id_producto ASC garantiza procesamiento determinista y facilita paginación futura.
     */
    public List<ProductoIndexRow> findProductosSinEmbedding(int limit) {
        return jdbc.query("""
            SELECT p.id_producto,
                   p.fk_id_empresa,
                   p.nombre_producto,
                   p.descripcion_corta,
                   p.marca,
                   p.sku,
                   p.tags,
                   p.especificaciones
            FROM   hot_click_producto_tb p
            LEFT JOIN hot_click_producto_embedding_tb e
                   ON e.fk_id_producto = p.id_producto
            WHERE  p.fk_id_estado      = 1
              AND  p.visible_catalogo  = true
              AND  p.fk_id_empresa     IS NOT NULL
              AND  (e.id_embedding IS NULL OR e.modelo_version != ?)
            ORDER  BY p.id_producto ASC
            LIMIT  ?
            """,
            (rs, rowNum) -> new ProductoIndexRow(
                rs.getLong("id_producto"),
                rs.getLong("fk_id_empresa"),
                rs.getString("nombre_producto"),
                rs.getString("descripcion_corta"),
                rs.getString("marca"),
                rs.getString("sku"),
                rs.getString("tags"),
                rs.getString("especificaciones")
            ),
            CURRENT_MODEL, limit
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Convierte float[] al formato de literal de pgvector: [f1,f2,...,fn].
     * Arrays.stream no existe para float[], así que se itera manualmente.
     */
    static String toVectorString(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(',');
            // 8 decimales es suficiente para preservar la precisión de un float32
            sb.append(String.format("%.8f", vector[i]));
        }
        return sb.append(']').toString();
    }

    // ── DTO interno ───────────────────────────────────────────────────────────

    /**
     * Proyección de los campos de hot_click_producto_tb necesarios para construir
     * el texto de indexación. Se usa solo dentro del paquete rag.
     */
    public record ProductoIndexRow(
        Long   productoId,
        Long   empresaId,
        String nombreProducto,
        String descripcionCorta,
        String marcaTexto,
        String sku,
        String tags,
        String especificaciones
    ) {}
}
