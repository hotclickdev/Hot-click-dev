-- V63: RAG — Shopping assistant sessions and conversation messages
-- Distinct from hot_click_ai_mensaje_tb (V42) which belongs to the admin
-- AI copilot. This table pair is for the public-facing shopping assistant.
--
-- Session lifecycle: created on first user message, expires after
-- inactivity (DataRetentionScheduler cleans rows older than 30 days).
-- Sessions are anonymous-first: fk_id_usuario is NULL for guests;
-- it gets filled if the user logs in mid-conversation.

-- ── 1. Sessions table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hot_click_chat_sesion_tb (
    -- UUID primary key: returned to the browser/client on session creation.
    -- The client sends it back on subsequent requests (cookie or localStorage).
    -- gen_random_uuid() is available on PostgreSQL 13+ (Supabase runs PG 15).
    id_sesion         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    fk_id_empresa     BIGINT       NOT NULL
                          REFERENCES hot_click_empresa_tb(id_empresa)
                          ON DELETE CASCADE,

    -- NULL for anonymous visitors; populated when a guest authenticates.
    -- ON DELETE SET NULL: preserves conversation history if the user account
    -- is later deleted (relevant for data-retention compliance).
    fk_id_usuario     BIGINT
                          REFERENCES hot_click_usuario_tb(id_usuario)
                          ON DELETE SET NULL,

    -- Entry point of the session. Used for analytics and routing logic.
    canal             VARCHAR(20)  NOT NULL DEFAULT 'WEB',

    iniciada_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- Updated on every message. DataRetentionScheduler uses this to expire
    -- idle sessions (DELETE WHERE ultimo_mensaje_en < NOW() - INTERVAL '30 days').
    ultimo_mensaje_en TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- Flexible state bag: temporary cart snapshot, active filters, last
    -- viewed category, etc. Structure owned by ShoppingAssistantService.
    -- Example: {"carrito_temp": [...], "filtros": {"categoria": 3}}
    metadatos         JSONB        NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT chk_chat_sesion_canal
        CHECK (canal IN ('WEB', 'WHATSAPP', 'QR', 'EMBED'))
);

-- ── 2. Messages table ─────────────────────────────────────────────────────────
-- Stores the ordered conversation turns for each session.
-- fk_id_empresa is denormalized here to allow empresa-scoped queries
-- without joining to hot_click_chat_sesion_tb (faster dashboard aggregates).
CREATE TABLE IF NOT EXISTS hot_click_chat_mensaje_shopping_tb (
    id_mensaje        BIGSERIAL    PRIMARY KEY,

    fk_id_sesion      UUID         NOT NULL
                          REFERENCES hot_click_chat_sesion_tb(id_sesion)
                          ON DELETE CASCADE,

    -- Denormalized for efficient per-tenant analytics queries.
    fk_id_empresa     BIGINT       NOT NULL
                          REFERENCES hot_click_empresa_tb(id_empresa)
                          ON DELETE CASCADE,

    -- 'user' | 'assistant' | 'system'
    -- 'system' stores the RAG context prompt (for debugging / prompt auditing).
    rol               VARCHAR(20)  NOT NULL,

    contenido         TEXT         NOT NULL,

    -- Token accounting feeds into hot_click_ai_uso_tb via AiQuotaService.
    tokens_entrada    INTEGER      NOT NULL DEFAULT 0,
    tokens_salida     INTEGER      NOT NULL DEFAULT 0,

    -- Array of product IDs cited in this assistant turn.
    -- Populated by PromptBuilder when products are retrieved via RAG.
    -- Example: [{"id": 42, "nombre": "Teclado Mecánico", "precio": 35000}]
    productos_refs    JSONB        NOT NULL DEFAULT '[]'::jsonb,

    fecha_creacion    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_chat_msg_rol
        CHECK (rol IN ('user', 'assistant', 'system'))
);

-- ── 3. Indexes ────────────────────────────────────────────────────────────────

-- Primary read pattern: load the last N messages of a session (conversation context).
CREATE INDEX IF NOT EXISTS idx_chat_sesion_empresa
    ON hot_click_chat_sesion_tb (fk_id_empresa, ultimo_mensaje_en DESC);

-- Used by DataRetentionScheduler to find and delete expired sessions.
CREATE INDEX IF NOT EXISTS idx_chat_sesion_expiry
    ON hot_click_chat_sesion_tb (ultimo_mensaje_en);

-- Partial index: link guest sessions to an account once the user logs in.
CREATE INDEX IF NOT EXISTS idx_chat_sesion_usuario
    ON hot_click_chat_sesion_tb (fk_id_usuario)
    WHERE fk_id_usuario IS NOT NULL;

-- ConversationContextBuilder: fetch ordered history for a session.
CREATE INDEX IF NOT EXISTS idx_chat_msg_sesion
    ON hot_click_chat_mensaje_shopping_tb (fk_id_sesion, fecha_creacion ASC);

-- Admin analytics: per-tenant message volume over time.
CREATE INDEX IF NOT EXISTS idx_chat_msg_empresa_fecha
    ON hot_click_chat_mensaje_shopping_tb (fk_id_empresa, fecha_creacion DESC);
