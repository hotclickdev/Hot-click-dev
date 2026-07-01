-- V90: Tabla de analytics para el chat público.
-- Registra cada interacción para detectar demanda insatisfecha y medir conversión.
CREATE TABLE IF NOT EXISTS hot_click_chat_log_tb (
    id                  BIGSERIAL PRIMARY KEY,
    fk_id_empresa       BIGINT    NOT NULL,
    idioma              VARCHAR(5)  NOT NULL DEFAULT 'es',
    intencion           VARCHAR(30),          -- REGALO | PRESUPUESTO | PROBLEMA | GENERAL
    mensaje_length      INT,
    productos_encontrados INT      NOT NULL DEFAULT 0,
    budget_detectado    BIGINT,               -- precio máximo mencionado, si lo hubo
    terminos_busqueda   TEXT,                 -- keywords extraídos
    fuera_horario       BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_log_empresa_ts
    ON hot_click_chat_log_tb (fk_id_empresa, created_at DESC);
