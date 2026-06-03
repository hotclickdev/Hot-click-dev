-- F22.5: AI Governance — usage tracking per empresa per month
CREATE TABLE IF NOT EXISTS hot_click_ai_uso_tb (
    id_uso          BIGSERIAL    PRIMARY KEY,
    fk_id_empresa   BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    anio            INTEGER      NOT NULL,
    mes             INTEGER      NOT NULL,
    llamadas        INTEGER      NOT NULL DEFAULT 0,
    tokens_entrada  INTEGER      NOT NULL DEFAULT 0,
    tokens_salida   INTEGER      NOT NULL DEFAULT 0,
    UNIQUE (fk_id_empresa, anio, mes)
);

CREATE INDEX IF NOT EXISTS idx_ai_uso_empresa_mes ON hot_click_ai_uso_tb (fk_id_empresa, anio, mes);
