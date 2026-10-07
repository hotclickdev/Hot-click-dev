-- V157: negocio temporal que el operador abre y la persona completa por un enlace.

CREATE TABLE IF NOT EXISTS hot_click_tienda_rapida_tb (
    id_tienda_rapida BIGSERIAL PRIMARY KEY,
    fk_id_empresa    BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_usuario    BIGINT       NOT NULL REFERENCES hot_click_usuario_tb(id_usuario),
    persona          VARCHAR(80)  NOT NULL,
    telefono         VARCHAR(20)  NOT NULL,
    dias             INTEGER      NOT NULL,
    vence            TIMESTAMP    NOT NULL,
    token            VARCHAR(64)  NOT NULL,
    estado           VARCHAR(20)  NOT NULL,
    creada           TIMESTAMP    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tienda_rapida_token
    ON hot_click_tienda_rapida_tb (token);

CREATE INDEX IF NOT EXISTS idx_tienda_rapida_empresa
    ON hot_click_tienda_rapida_tb (fk_id_empresa);
