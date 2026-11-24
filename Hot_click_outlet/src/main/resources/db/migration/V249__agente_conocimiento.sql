-- V249: AG-11 — base de conocimiento por tienda para el bot de ventas (políticas, envíos, horarios, FAQ).
-- fk_id_empresa NULL = conocimiento de HotClick (bot de la plataforma).
-- Idempotente. Si pgvector no está disponible, la tabla se crea igual sin columna de embedding ni índice HNSW
-- y la herramienta consultar_conocimiento cae a búsqueda por palabras (patrón de V62/V64).

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector no disponible: conocimiento del agente sin embeddings';
END $$;

CREATE TABLE IF NOT EXISTS hot_click_agente_conocimiento_tb (
    id               BIGSERIAL    PRIMARY KEY,
    fk_id_empresa    BIGINT       REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    titulo           VARCHAR(200) NOT NULL,
    contenido        TEXT         NOT NULL,
    categoria        VARCHAR(50),
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    modelo_version   VARCHAR(50),
    creado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agente_conocimiento_empresa
    ON hot_click_agente_conocimiento_tb (fk_id_empresa) WHERE activo;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        ALTER TABLE hot_click_agente_conocimiento_tb ADD COLUMN IF NOT EXISTS embedding vector(512);
        CREATE INDEX IF NOT EXISTS idx_agente_conocimiento_hnsw
            ON hot_click_agente_conocimiento_tb
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64);
    END IF;
END $$;
