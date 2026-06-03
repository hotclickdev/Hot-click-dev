-- ============================================================
-- V23: Soporte de subcategorías (árbol ilimitado)
-- El modelo Categoria ya tiene el campo categoriaPadre en Java.
-- Esta migración crea la columna FK que faltaba en la BD.
-- ============================================================

ALTER TABLE hot_click_categoria_tb
  ADD COLUMN IF NOT EXISTS fk_id_categoria_padre BIGINT
    REFERENCES hot_click_categoria_tb(id_categoria) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categoria_padre
  ON hot_click_categoria_tb (fk_id_categoria_padre);
