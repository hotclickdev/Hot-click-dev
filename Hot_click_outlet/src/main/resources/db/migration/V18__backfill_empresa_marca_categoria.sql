-- V18: Rellenar fk_id_empresa en marcas y categorías que tienen NULL
-- Estas filas fueron creadas antes del fix de CompanyScope y quedaron sin empresa asignada.
-- Las asignamos usando la empresa del usuario que las creó (fk_id_admin_cliente).

-- Marcas sin empresa cuyo creador sí tiene empresa
UPDATE hot_click_marca_tb m
SET fk_id_empresa = u.fk_id_empresa
FROM hot_click_usuario_tb u
WHERE m.fk_id_admin_cliente = u.id_usuario
  AND m.fk_id_empresa IS NULL
  AND u.fk_id_empresa IS NOT NULL;

-- Categorías sin empresa cuyo creador sí tiene empresa
UPDATE hot_click_categoria_tb c
SET fk_id_empresa = u.fk_id_empresa
FROM hot_click_usuario_tb u
WHERE c.fk_id_admin_cliente = u.id_usuario
  AND c.fk_id_empresa IS NULL
  AND u.fk_id_empresa IS NOT NULL;
