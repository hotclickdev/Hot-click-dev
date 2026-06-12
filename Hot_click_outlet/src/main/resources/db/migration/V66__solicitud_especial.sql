-- V66: tabla para solicitudes especiales de productos no encontrados en catálogo
CREATE TABLE IF NOT EXISTS hot_click_solicitud_especial_tb (
    id              BIGSERIAL    PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    whatsapp        VARCHAR(20)  NOT NULL,
    correo          VARCHAR(150),
    descripcion     TEXT,
    imagen_url      TEXT,
    estado          VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    fk_id_empresa   BIGINT REFERENCES hot_click_empresa_tb(id_empresa)
);

CREATE INDEX IF NOT EXISTS idx_solicitud_especial_estado
    ON hot_click_solicitud_especial_tb (estado);

CREATE INDEX IF NOT EXISTS idx_solicitud_especial_empresa
    ON hot_click_solicitud_especial_tb (fk_id_empresa);
