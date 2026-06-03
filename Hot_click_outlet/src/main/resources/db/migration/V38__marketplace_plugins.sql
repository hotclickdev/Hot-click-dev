-- F19: Marketplace de plugins (webhook + iframe)
CREATE TABLE IF NOT EXISTS hot_click_plugin_tb (
    id_plugin         BIGSERIAL    PRIMARY KEY,
    fk_id_empresa     BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    nombre            VARCHAR(100) NOT NULL,
    descripcion       VARCHAR(500),
    tipo              VARCHAR(20)  NOT NULL DEFAULT 'WEBHOOK',
    url               VARCHAR(500) NOT NULL,
    eventos_suscritos TEXT         NOT NULL DEFAULT '[]',
    secreto_hmac      VARCHAR(100),
    activo            BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hot_click_plugin_evento_tb (
    id_log          BIGSERIAL    PRIMARY KEY,
    fk_id_plugin    BIGINT       NOT NULL REFERENCES hot_click_plugin_tb(id_plugin),
    evento          VARCHAR(100) NOT NULL,
    payload         TEXT,
    estado          VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    codigo_respuesta INTEGER,
    mensaje_error    VARCHAR(500),
    fecha_envio     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plugin_empresa ON hot_click_plugin_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_plugin_evento_plugin ON hot_click_plugin_evento_tb (fk_id_plugin);
CREATE INDEX IF NOT EXISTS idx_plugin_evento_fecha ON hot_click_plugin_evento_tb (fecha_envio DESC);
