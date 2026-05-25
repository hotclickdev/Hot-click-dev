-- ============================================================
-- V4: Tabla de imágenes de producto y columna stock_reservado
-- ============================================================

-- Columna stock_reservado en producto (reserva durante checkout)
ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS stock_reservado INTEGER NOT NULL DEFAULT 0;

-- Tabla de imágenes adicionales por producto
CREATE TABLE IF NOT EXISTS hot_click_producto_imagen_tb (
    id_imagen            BIGSERIAL    PRIMARY KEY,
    url_imagen           VARCHAR(500) NOT NULL,
    public_id_cloudinary VARCHAR(200),
    posicion             INTEGER      NOT NULL DEFAULT 0,
    es_principal         BOOLEAN      NOT NULL DEFAULT false,
    alt_text             VARCHAR(200),
    fk_id_producto       BIGINT       NOT NULL REFERENCES hot_click_producto_tb(id_producto) ON DELETE CASCADE,
    fk_id_estado         INTEGER      NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_producto_imagen_producto
    ON hot_click_producto_imagen_tb (fk_id_producto, posicion);
