-- PASO 1: Ver todas las empresas y su estado
SELECT id_empresa, nombre_empresa, estado_empresa, visibilidad_publica
FROM hot_click_empresa_tb
ORDER BY id_empresa;

-- PASO 2: Ver a qué empresa pertenece cada marca (resultado actual)
SELECT m.id_marca, m.nombre_marca, m.fk_id_empresa,
       e.nombre_empresa, e.estado_empresa, e.visibilidad_publica
FROM hot_click_marca_tb m
LEFT JOIN hot_click_empresa_tb e ON m.fk_id_empresa = e.id_empresa
WHERE m.fk_id_estado = 1
ORDER BY m.id_marca;

-- PASO 3: Ver a qué empresa pertenece cada categoría
SELECT c.id_categoria, c.nombre_categoria, c.fk_id_empresa,
       e.nombre_empresa, e.estado_empresa
FROM hot_click_categoria_tb c
LEFT JOIN hot_click_empresa_tb e ON c.fk_id_empresa = e.id_empresa
WHERE c.fk_id_estado = 1
ORDER BY c.id_categoria;
