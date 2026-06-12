-- Memoria persistente de visitante anónimo
-- Almacena intereses, marcas y presupuesto estimado inferidos de las conversaciones con los agentes IA.
-- Identificación vía cookie hotclick_visitor_id (UUID v4, 365 días).

CREATE TABLE IF NOT EXISTS customer_memory (
    id               BIGSERIAL    PRIMARY KEY,
    visitor_id       VARCHAR(36)  NOT NULL,
    summary          TEXT,
    interests        JSONB        NOT NULL DEFAULT '[]',
    preferred_brands JSONB        NOT NULL DEFAULT '[]',
    estimated_budget BIGINT,
    last_visit       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customer_memory_visitor UNIQUE (visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_memory_visitor
    ON customer_memory (visitor_id);
