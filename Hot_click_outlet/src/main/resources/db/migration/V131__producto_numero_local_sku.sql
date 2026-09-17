-- SKU y número de producto por negocio (no el id global de la plataforma).
-- Quita el UNIQUE global de SKU; el único vigente es por empresa.

ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS numero_local INTEGER;

ALTER TABLE hot_click_producto_tb DROP CONSTRAINT IF EXISTS uk_producto_sku;

CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_numero_local_empresa
    ON hot_click_producto_tb (fk_id_empresa, numero_local)
    WHERE fk_id_empresa IS NOT NULL AND numero_local IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_sku_empresa
    ON hot_click_producto_tb (sku, fk_id_empresa)
    WHERE fk_id_empresa IS NOT NULL;

-- Backfill: orden por id_producto dentro de cada empresa.
WITH ranked AS (
    SELECT id_producto,
           fk_id_empresa,
           ROW_NUMBER() OVER (PARTITION BY fk_id_empresa ORDER BY id_producto) AS n
    FROM hot_click_producto_tb
    WHERE fk_id_empresa IS NOT NULL
)
UPDATE hot_click_producto_tb p
SET numero_local = ranked.n,
    sku = 'E' || ranked.fk_id_empresa || '-' || LPAD(CAST(ranked.n AS VARCHAR), 4, '0')
FROM ranked
WHERE p.id_producto = ranked.id_producto
  AND (p.numero_local IS NULL OR p.sku IS NULL OR p.sku LIKE 'HC-%');
