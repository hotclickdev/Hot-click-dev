-- Planes SaaS EMPRENDEDOR / PYME / NEGOCIO_PLUS + demos QA.
-- Idempotente: si V89 ya corrió, solo asegura activo y asigna demos.

INSERT INTO hot_click_plan_tb
    (nombre, descripcion, precio_mensual, precio_usd, comision_porcentaje,
     max_usuarios, max_productos, max_bodegas, max_cajas,
     tiene_pos, tiene_crm, tiene_compras, tiene_reportes, tiene_ai, tiene_api,
     max_creditos_ai, activo)
VALUES
    ('EMPRENDEDOR',
     'Plan gratuito. Modelo basado en comisión por venta.',
     0, 0.00, 1.50,
     2, 50, 1, 1,
     false, false, false, true, false, false,
     0, true),
    ('PYME',
     'Plan para negocios en crecimiento. Incluye IA y reportes.',
     0, 11.99, 0.00,
     5, 500, 2, 2,
     true, false, true, true, true, false,
     80, true),
    ('NEGOCIO_PLUS',
     'Plan completo. Usuarios ilimitados, IA sin límite.',
     0, 19.99, 0.00,
     -1, -1, -1, -1,
     true, true, true, true, true, false,
     -1, true)
ON CONFLICT (nombre) DO UPDATE SET
    activo = true,
    descripcion = EXCLUDED.descripcion,
    precio_usd = EXCLUDED.precio_usd,
    comision_porcentaje = EXCLUDED.comision_porcentaje,
    max_usuarios = EXCLUDED.max_usuarios,
    max_productos = EXCLUDED.max_productos,
    max_bodegas = EXCLUDED.max_bodegas,
    max_cajas = EXCLUDED.max_cajas,
    tiene_pos = EXCLUDED.tiene_pos,
    tiene_crm = EXCLUDED.tiene_crm,
    tiene_compras = EXCLUDED.tiene_compras,
    tiene_reportes = EXCLUDED.tiene_reportes,
    tiene_ai = EXCLUDED.tiene_ai,
    tiene_api = EXCLUDED.tiene_api,
    max_creditos_ai = EXCLUDED.max_creditos_ai;

-- Empresas sin plan → EMPRENDEDOR
UPDATE hot_click_empresa_tb e
SET fk_id_plan = p.id_plan,
    plan_saas = 'EMPRENDEDOR'
FROM hot_click_plan_tb p
WHERE p.nombre = 'EMPRENDEDOR'
  AND e.fk_id_plan IS NULL;

-- Demo PYME
UPDATE hot_click_empresa_tb e
SET fk_id_plan = p.id_plan,
    plan_saas = 'PYME'
FROM hot_click_plan_tb p
WHERE p.nombre = 'PYME'
  AND (
    e.correo_empresa = 'qa.pyme.demo@hotclick.test'
    OR e.id_empresa IN (
      SELECT u.fk_id_empresa FROM hot_click_usuario_tb u
      WHERE u.correo = 'qa.pyme.demo@hotclick.test' AND u.fk_id_empresa IS NOT NULL
    )
  );

-- Demo Negocio Plus
UPDATE hot_click_empresa_tb e
SET fk_id_plan = p.id_plan,
    plan_saas = 'NEGOCIO_PLUS'
FROM hot_click_plan_tb p
WHERE p.nombre = 'NEGOCIO_PLUS'
  AND (
    e.correo_empresa = 'qa.negocioplus.demo@hotclick.test'
    OR e.id_empresa IN (
      SELECT u.fk_id_empresa FROM hot_click_usuario_tb u
      WHERE u.correo = 'qa.negocioplus.demo@hotclick.test' AND u.fk_id_empresa IS NOT NULL
    )
  );
