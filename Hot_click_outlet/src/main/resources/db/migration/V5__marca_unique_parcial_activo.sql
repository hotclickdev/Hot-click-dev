-- ============================================================
-- V5: Reemplazar UNIQUE(nombre_marca) global por índice parcial
--     que sólo aplica a marcas activas (fk_id_estado = 1).
--     Esto permite reutilizar nombres de marcas eliminadas (soft-delete).
-- ============================================================

-- Eliminar la constraint UNIQUE original si aún existe
ALTER TABLE hot_click_marca_tb
    DROP CONSTRAINT IF EXISTS hot_click_marca_tb_nombre_marca_key;

-- Índice único parcial: dos marcas activas no pueden tener el mismo nombre,
-- pero una marca inactiva (estado=0) no bloquea crear/renombrar una activa.
CREATE UNIQUE INDEX IF NOT EXISTS idx_marca_nombre_activo
    ON hot_click_marca_tb (nombre_marca)
    WHERE fk_id_estado = 1;
