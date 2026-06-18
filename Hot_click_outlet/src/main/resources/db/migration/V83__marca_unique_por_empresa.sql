-- V83: Reemplaza el índice único global de marcas (V5) por uno con scope de empresa.
-- El índice anterior impedía que dos empresas distintas usaran el mismo nombre de marca,
-- lo cual es incorrecto en un SaaS multi-tenant.
--
-- Nueva regla:
--   - Marcas CON empresa: nombre único por (nombre_marca, fk_id_empresa) activas.
--   - Marcas SIN empresa (sistema): nombre único global activo (mantiene comportamiento V5).

DROP INDEX IF EXISTS idx_marca_nombre_activo;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marca_nombre_empresa_activo
    ON hot_click_marca_tb (nombre_marca, fk_id_empresa)
    WHERE fk_id_estado = 1
      AND fk_id_empresa IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marca_nombre_global_activo
    ON hot_click_marca_tb (nombre_marca)
    WHERE fk_id_estado = 1
      AND fk_id_empresa IS NULL;
