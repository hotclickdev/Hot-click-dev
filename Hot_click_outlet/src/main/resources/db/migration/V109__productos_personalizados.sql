-- V109: productos personalizados (encargos con imágenes de referencia)

ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS es_personalizado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS modo_precio_personalizado VARCHAR(20);

ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS precio_personalizado_min INTEGER;

ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS precio_personalizado_max INTEGER;

ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS instrucciones_personalizacion TEXT;

CREATE TABLE IF NOT EXISTS hot_click_encargo_tb (
    id_encargo              BIGSERIAL PRIMARY KEY,
    fk_id_producto          BIGINT NOT NULL REFERENCES hot_click_producto_tb(id_producto),
    fk_id_empresa           BIGINT NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_usuario           BIGINT REFERENCES hot_click_usuario_tb(id_usuario),
    fk_id_pedido            BIGINT REFERENCES hot_click_pedido_tb(id_pedido),
    nombre_cliente          VARCHAR(120) NOT NULL,
    telefono                VARCHAR(30),
    email                   VARCHAR(200) NOT NULL,
    imagen_url_1            VARCHAR(500),
    imagen_url_2            VARCHAR(500),
    imagen_url_3            VARCHAR(500),
    notas                   TEXT,
    talla_seleccionada      VARCHAR(50),
    modo_precio             VARCHAR(20) NOT NULL,
    precio_cotizado         INTEGER,
    estado                  VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    motivo_rechazo          TEXT,
    token_publico           VARCHAR(36) NOT NULL,
    fecha_vencimiento       TIMESTAMP,
    fecha_creacion          TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion     TIMESTAMP,
    fk_id_estado            INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_encargo_token
    ON hot_click_encargo_tb (token_publico);

CREATE INDEX IF NOT EXISTS idx_encargo_empresa_estado
    ON hot_click_encargo_tb (fk_id_empresa, estado);

CREATE INDEX IF NOT EXISTS idx_encargo_producto
    ON hot_click_encargo_tb (fk_id_producto);
