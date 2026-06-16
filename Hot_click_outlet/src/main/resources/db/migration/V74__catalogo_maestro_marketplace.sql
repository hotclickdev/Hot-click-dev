-- V72: Catálogo Maestro para marketplace multi-tenant
-- Permite agrupar el mismo producto físico vendido por N emprendedores
-- y aplica Buy Box (geo + precio) para mostrar el vendedor prioritario.

-- ─── 1. Tabla maestra ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hot_click_catalogo_maestro_tb (
    id_catalogo_maestro  BIGSERIAL    PRIMARY KEY,
    nombre               VARCHAR(200) NOT NULL,
    descripcion_corta    VARCHAR(400),
    descripcion_larga    TEXT,
    imagen_principal_url VARCHAR(500),
    imagenes_extra       TEXT,                          -- URLs separadas por coma
    sku_fabricante       VARCHAR(100),                  -- criterio de agrupación 1
    codigo_barras        VARCHAR(50),                   -- criterio de agrupación 2 (EAN/UPC)
    modelo               VARCHAR(100),                  -- criterio de agrupación 3 (+ marca)
    fk_id_marca          BIGINT REFERENCES hot_click_marca_tb(id_marca)         ON DELETE SET NULL,
    fk_id_categoria      BIGINT REFERENCES hot_click_categoria_tb(id_categoria) ON DELETE SET NULL,
    tags                 TEXT,
    activo               BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion       TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion  TIMESTAMP DEFAULT NOW()
);

-- Columna generada para full-text search en español
ALTER TABLE hot_click_catalogo_maestro_tb
    ADD COLUMN IF NOT EXISTS busqueda_ts tsvector
    GENERATED ALWAYS AS (
        to_tsvector('spanish',
            coalesce(nombre,         '') || ' ' ||
            coalesce(modelo,         '') || ' ' ||
            coalesce(tags,           '') || ' ' ||
            coalesce(sku_fabricante, '') || ' ' ||
            coalesce(codigo_barras,  '')
        )
    ) STORED;

-- Índice GIN para búsqueda full-text (el más importante)
CREATE INDEX IF NOT EXISTS idx_cm_busqueda_ts
    ON hot_click_catalogo_maestro_tb USING GIN(busqueda_ts);

-- Índices únicos para los tres criterios de agrupación
CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_barcode
    ON hot_click_catalogo_maestro_tb(codigo_barras)
    WHERE codigo_barras IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_sku
    ON hot_click_catalogo_maestro_tb(sku_fabricante)
    WHERE sku_fabricante IS NOT NULL;

-- Marca + modelo (case-insensitive) como tercer criterio
CREATE UNIQUE INDEX IF NOT EXISTS idx_cm_marca_modelo
    ON hot_click_catalogo_maestro_tb(fk_id_marca, lower(modelo))
    WHERE fk_id_marca IS NOT NULL AND modelo IS NOT NULL;

-- ─── 2. FK en productos ───────────────────────────────────────────────────────
ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS fk_id_catalogo_maestro BIGINT
    REFERENCES hot_click_catalogo_maestro_tb(id_catalogo_maestro) ON DELETE SET NULL;

-- Índice parcial (solo filas con FK no nula para no penalizar productos sin grupo)
CREATE INDEX IF NOT EXISTS idx_producto_catalogo_maestro
    ON hot_click_producto_tb(fk_id_catalogo_maestro)
    WHERE fk_id_catalogo_maestro IS NOT NULL;

-- ─── 3. Ubicación geográfica en bodega ───────────────────────────────────────
-- Las columnas provincia/canton y su índice normalizado se crean en
-- V73__geo_normalizer_index.sql (corre antes que esta migración).
