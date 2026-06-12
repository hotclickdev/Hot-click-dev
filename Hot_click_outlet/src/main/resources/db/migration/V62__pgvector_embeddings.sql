-- V62: RAG — pgvector extension + product semantic embeddings
-- Enables AI-powered shopping assistant similarity search.
-- Model: Gemini text-embedding-004 → 768-dimensional vectors, cosine similarity.
--
-- PgBouncer (transaction mode) notes:
--   • All DDL is idempotent (IF NOT EXISTS / IF EXISTS).
--   • hnsw.ef_search must be SET LOCAL inside a transaction at query time —
--     never SET (session) which would be silently lost on connection return.
--   • Prepared statements are not used; queries go through JdbcTemplate.

-- ── 1. Extension ─────────────────────────────────────────────────────────────
-- Supabase already ships pgvector; this is a no-op if already enabled.
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 2. Embeddings table ───────────────────────────────────────────────────────
-- One row per product per empresa (tenant-isolated).
-- ON DELETE CASCADE: when a product is hard-deleted its embedding is removed
-- automatically, keeping the table consistent without a scheduled cleanup job.
CREATE TABLE IF NOT EXISTS hot_click_producto_embedding_tb (
    id_embedding     BIGSERIAL    PRIMARY KEY,
    fk_id_producto   BIGINT       NOT NULL
                         REFERENCES hot_click_producto_tb(id_producto)
                         ON DELETE CASCADE,
    fk_id_empresa    BIGINT       NOT NULL
                         REFERENCES hot_click_empresa_tb(id_empresa)
                         ON DELETE CASCADE,

    -- Vector produced by Gemini text-embedding-004 (768 dims).
    -- Changing the model requires dropping and rebuilding this column + index.
    embedding        vector(768)  NOT NULL,

    -- Raw text that was embedded: nombre_producto || descripcion_corta || tags || marca.
    -- Stored to detect when the product has changed and the embedding is stale.
    texto_indexado   TEXT         NOT NULL,

    -- Model identifier stored per row so future migrations can filter stale
    -- embeddings (e.g. reindex only rows with an older model_version).
    modelo_version   VARCHAR(50)  NOT NULL DEFAULT 'text-embedding-004',

    creado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- Updated by the indexer job whenever the product content changes.
    actualizado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- One embedding per product. The indexer upserts using this constraint.
    CONSTRAINT uq_embedding_producto UNIQUE (fk_id_producto)
);

-- ── 3. HNSW index (approximate nearest-neighbor, cosine distance) ─────────────
-- HNSW is preferred over IVFFlat for this use case:
--   • No training phase (IVFFlat needs ANALYZE + data to build lists).
--   • Supports inserts without full rebuild (critical for incremental indexer).
--   • Better recall at same ef_search vs IVFFlat at comparable nprobes.
--
-- m = 16  : connections per layer — standard production default.
--           Higher values (32) improve recall but double index memory.
-- ef_construction = 64 : candidate list size during build.
--           Higher values (128) produce a better-quality index at build time.
--           64 is sufficient for a product catalog of < 500k items.
--
-- NOTE: Building this index on a large existing table will take seconds to
-- minutes. Flyway runs this inside a transaction; pgvector builds HNSW
-- indexes without locking reads (CONCURRENT is implicit for index creation
-- on a new table, which this is). For existing large tables, use
-- CREATE INDEX CONCURRENTLY outside a transaction.
CREATE INDEX IF NOT EXISTS idx_producto_emb_hnsw
    ON hot_click_producto_embedding_tb
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ── 4. Supporting indexes ─────────────────────────────────────────────────────

-- Tenant-scoped similarity queries always filter by empresa first.
-- This btree index satisfies the WHERE fk_id_empresa = ? predicate cheaply
-- before the HNSW scan narrows to relevant vectors.
CREATE INDEX IF NOT EXISTS idx_producto_emb_empresa
    ON hot_click_producto_embedding_tb (fk_id_empresa);

-- Used by EmbeddingIndexerService to find stale embeddings:
--   SELECT ... WHERE fk_id_empresa = ? AND actualizado_en < ?
-- Partial index over actualizado_en avoids scanning the whole table.
CREATE INDEX IF NOT EXISTS idx_producto_emb_stale
    ON hot_click_producto_embedding_tb (fk_id_empresa, actualizado_en);
