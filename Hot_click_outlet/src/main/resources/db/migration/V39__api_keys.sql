-- F20: API Keys for external developer access
CREATE TABLE IF NOT EXISTS hot_click_api_key_tb (
    id_api_key      BIGSERIAL     PRIMARY KEY,
    fk_id_empresa   BIGINT        NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    nombre          VARCHAR(100)  NOT NULL,
    prefijo         VARCHAR(20)   NOT NULL,
    key_hash        VARCHAR(64)   NOT NULL UNIQUE,
    entorno         VARCHAR(10)   NOT NULL DEFAULT 'live',
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    ultimo_uso      TIMESTAMP,
    fecha_creacion  TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_hash    ON hot_click_api_key_tb (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_key_empresa ON hot_click_api_key_tb (fk_id_empresa);
