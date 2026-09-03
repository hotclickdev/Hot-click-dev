-- V120: marketplace sin tienda propia de plataforma
-- Soft-hide empresa 1 (HOTCLICK seed) y productos huérfanos (fk_id_empresa NULL).
-- No DELETE: pedidos/FKs históricas se conservan.

UPDATE hot_click_empresa_tb
SET estado_empresa = 'INACTIVO',
    visibilidad_publica = FALSE
WHERE id_empresa = 1
  AND (estado_empresa IS DISTINCT FROM 'INACTIVO'
       OR visibilidad_publica IS DISTINCT FROM FALSE);

UPDATE hot_click_producto_tb
SET visible_catalogo = FALSE
WHERE visible_catalogo = TRUE
  AND (fk_id_empresa = 1 OR fk_id_empresa IS NULL);
