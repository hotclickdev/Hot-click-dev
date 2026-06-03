-- F22: AI Copilot — conversation history per empresa
CREATE TABLE IF NOT EXISTS hot_click_ai_mensaje_tb (
    id_mensaje      BIGSERIAL    PRIMARY KEY,
    fk_id_empresa   BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    rol             VARCHAR(20)  NOT NULL,
    contenido       TEXT         NOT NULL,
    tokens          INTEGER      DEFAULT 0,
    fecha_creacion  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_msg_empresa ON hot_click_ai_mensaje_tb (fk_id_empresa, fecha_creacion DESC);
