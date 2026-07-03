-- Agrupa productos que son la misma pieza en distinto color/talla (ej. una sandalia
-- en 4 colores = 4 filas de producto, mismo grupo_variante_id). No es una tabla nueva:
-- alcanza con un tag compartido entre filas de producto ya existentes.
ALTER TABLE hot_click_producto_tb ADD COLUMN IF NOT EXISTS grupo_variante_id VARCHAR(64);
ALTER TABLE hot_click_producto_tb ADD COLUMN IF NOT EXISTS color_variante VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_producto_grupo_variante ON hot_click_producto_tb(grupo_variante_id) WHERE grupo_variante_id IS NOT NULL;
