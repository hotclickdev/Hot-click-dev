-- V64: Cambio de proveedor de embeddings: Gemini text-embedding-004 (768 dims) → Voyage AI voyage-3-lite (512 dims)
--
-- Motivo: la key de Google Vision API no tiene acceso al endpoint EmbedContent de
-- Generative Language API. Voyage AI es el proveedor recomendado por Anthropic para
-- RAG con Claude, con tier gratuito de 200M tokens/mes sin configuración adicional.
--
-- La tabla hot_click_producto_embedding_tb se espera vacía en este punto —
-- nunca se generaron embeddings Gemini exitosamente.
--
-- Idempotente: DROP IF EXISTS + ADD IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.

-- 1. Eliminar el índice HNSW (depende de la columna embedding)
DROP INDEX IF EXISTS idx_producto_emb_hnsw;

-- 2. Reemplazar columna: 768 dims → 512 dims
--    Se hace drop + add porque ALTER COLUMN TYPE no soporta cambio de dimensión en pgvector.
--    El DEFAULT temporal permite ADD NOT NULL con tabla potencialmente no vacía.
ALTER TABLE hot_click_producto_embedding_tb DROP COLUMN IF EXISTS embedding;
ALTER TABLE hot_click_producto_embedding_tb
    ADD COLUMN embedding vector(512) NOT NULL
        DEFAULT ('[' || repeat('0,', 511) || '0]')::vector(512);
ALTER TABLE hot_click_producto_embedding_tb ALTER COLUMN embedding DROP DEFAULT;

-- 3. Actualizar DEFAULT del modelo para nuevas filas
ALTER TABLE hot_click_producto_embedding_tb
    ALTER COLUMN modelo_version SET DEFAULT 'voyage-3-lite';

-- 4. Recrear índice HNSW para la nueva dimensión (512 dims, cosine)
CREATE INDEX IF NOT EXISTS idx_producto_emb_hnsw
    ON hot_click_producto_embedding_tb
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
