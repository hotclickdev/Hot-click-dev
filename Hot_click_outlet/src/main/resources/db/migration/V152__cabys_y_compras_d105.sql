-- V145: CAByS de 13 dígitos en el producto, tiquete ligado a la compra
-- y compras de proveedores para el consolidado del D-105.

ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS codigo_cabys VARCHAR(13);

ALTER TABLE hot_click_comprobante_fiscal_tb
    ADD COLUMN IF NOT EXISTS fk_id_compra BIGINT REFERENCES hot_click_compra_tb(id_compra);

CREATE INDEX IF NOT EXISTS idx_comprobante_compra
    ON hot_click_comprobante_fiscal_tb (fk_id_compra);

CREATE TABLE IF NOT EXISTS hot_click_compra_d105_tb (
    id_compra_d105      BIGSERIAL    PRIMARY KEY,
    clave_numerica      VARCHAR(50)  NOT NULL UNIQUE,
    tipo_documento      VARCHAR(2)   NOT NULL CHECK (tipo_documento IN ('01', '03')),
    fecha_emision       DATE         NOT NULL,
    anio                INTEGER      NOT NULL,
    trimestre           VARCHAR(2)   NOT NULL CHECK (trimestre IN ('Q1', 'Q2', 'Q3', 'Q4')),
    emisor_cedula       VARCHAR(20)  NOT NULL,
    emisor_nombre       VARCHAR(200) NOT NULL,
    subtotal_neto       INTEGER      NOT NULL,
    total_impuesto      INTEGER      NOT NULL,
    total_comprobante   INTEGER      NOT NULL,
    xml_path            VARCHAR(500),
    fk_id_usuario_carga BIGINT       REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE SET NULL,
    fecha_carga         TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compra_d105_trimestre
    ON hot_click_compra_d105_tb (anio, trimestre);
