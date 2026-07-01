-- V89: Reestructura de roles y planes SaaS
-- · ADMIN_IT → ADMIN
-- · ADMIN_CLIENTE → migrar usuarios a EMPRENDEDOR, luego inactivar
-- · Roles POS (CAJERO, INVENTARIO, CONTABILIDAD, GERENTE, SUPERVISOR, MARKETING, SOPORTE) → ocultar
-- · Planes renombrados: EMPRENDEDOR (gratis + comisión), PYME ($11.99), NEGOCIO_PLUS ($19.99)

-- ══════════════════════════════════════════════════════════
-- 1. ROLES
-- ══════════════════════════════════════════════════════════

-- 1a. Renombrar ADMIN_IT → ADMIN
UPDATE hot_click_rol_tb
SET nombre_rol = 'ADMIN',
    descripcion = 'Administrador del sistema HotClick'
WHERE nombre_rol = 'ADMIN_IT';

-- 1b. Migrar usuarios con ADMIN_CLIENTE → EMPRENDEDOR (para no dejarlos sin rol)
INSERT INTO hot_click_usuario_rol_tb (fk_id_usuario, fk_id_rol)
SELECT ur.fk_id_usuario,
       (SELECT id_rol FROM hot_click_rol_tb WHERE nombre_rol = 'EMPRENDEDOR')
FROM hot_click_usuario_rol_tb ur
JOIN hot_click_rol_tb r ON ur.fk_id_rol = r.id_rol
WHERE r.nombre_rol = 'ADMIN_CLIENTE'
ON CONFLICT DO NOTHING;

-- 1c. Eliminar asignaciones de ADMIN_CLIENTE
DELETE FROM hot_click_usuario_rol_tb
WHERE fk_id_rol = (SELECT id_rol FROM hot_click_rol_tb WHERE nombre_rol = 'ADMIN_CLIENTE');

-- 1d. Inactivar el rol ADMIN_CLIENTE
UPDATE hot_click_rol_tb
SET fk_id_estado = 2,
    descripcion  = '[ELIMINADO — reemplazado por EMPRENDEDOR]'
WHERE nombre_rol = 'ADMIN_CLIENTE';

-- 1e. Ocultar roles POS (no se borran — se pueden reactivar cuando se necesiten)
UPDATE hot_click_rol_tb
SET fk_id_estado = 2
WHERE nombre_rol IN ('CAJERO', 'INVENTARIO', 'CONTABILIDAD', 'GERENTE', 'SUPERVISOR', 'MARKETING', 'SOPORTE');

-- ══════════════════════════════════════════════════════════
-- 2. PLANES — nuevas columnas
-- ══════════════════════════════════════════════════════════

ALTER TABLE hot_click_plan_tb
    ADD COLUMN IF NOT EXISTS precio_usd         NUMERIC(8,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comision_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0;

-- ══════════════════════════════════════════════════════════
-- 3. PLANES — inactivar los anteriores y crear los 3 nuevos
-- ══════════════════════════════════════════════════════════

-- Inactivar todos los planes anteriores
UPDATE hot_click_plan_tb SET activo = false;

-- Plan EMPRENDEDOR — gratuito + 1.5 % de comisión sobre cada venta
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
     false, false, false, false, false, false,
     0, true)
ON CONFLICT (nombre) DO UPDATE SET
    descripcion          = EXCLUDED.descripcion,
    precio_mensual       = EXCLUDED.precio_mensual,
    precio_usd           = EXCLUDED.precio_usd,
    comision_porcentaje  = EXCLUDED.comision_porcentaje,
    max_usuarios         = EXCLUDED.max_usuarios,
    max_productos        = EXCLUDED.max_productos,
    max_bodegas          = EXCLUDED.max_bodegas,
    max_cajas            = EXCLUDED.max_cajas,
    tiene_pos            = EXCLUDED.tiene_pos,
    tiene_crm            = EXCLUDED.tiene_crm,
    tiene_compras        = EXCLUDED.tiene_compras,
    tiene_reportes       = EXCLUDED.tiene_reportes,
    tiene_ai             = EXCLUDED.tiene_ai,
    tiene_api            = EXCLUDED.tiene_api,
    max_creditos_ai      = EXCLUDED.max_creditos_ai,
    activo               = EXCLUDED.activo;

-- Plan PYME — $11.99 USD/mes, sin comisión
INSERT INTO hot_click_plan_tb
    (nombre, descripcion, precio_mensual, precio_usd, comision_porcentaje,
     max_usuarios, max_productos, max_bodegas, max_cajas,
     tiene_pos, tiene_crm, tiene_compras, tiene_reportes, tiene_ai, tiene_api,
     max_creditos_ai, activo)
VALUES
    ('PYME',
     'Plan para negocios en crecimiento. Incluye IA y reportes.',
     0, 11.99, 0.00,
     5, 500, 2, 2,
     true, false, true, true, true, false,
     80, true)
ON CONFLICT (nombre) DO UPDATE SET
    descripcion          = EXCLUDED.descripcion,
    precio_usd           = EXCLUDED.precio_usd,
    comision_porcentaje  = EXCLUDED.comision_porcentaje,
    max_usuarios         = EXCLUDED.max_usuarios,
    max_productos        = EXCLUDED.max_productos,
    max_bodegas          = EXCLUDED.max_bodegas,
    max_cajas            = EXCLUDED.max_cajas,
    tiene_pos            = EXCLUDED.tiene_pos,
    tiene_crm            = EXCLUDED.tiene_crm,
    tiene_compras        = EXCLUDED.tiene_compras,
    tiene_reportes       = EXCLUDED.tiene_reportes,
    tiene_ai             = EXCLUDED.tiene_ai,
    tiene_api            = EXCLUDED.tiene_api,
    max_creditos_ai      = EXCLUDED.max_creditos_ai,
    activo               = EXCLUDED.activo;

-- Plan NEGOCIO_PLUS — $19.99 USD/mes, sin comisión, todo ilimitado
INSERT INTO hot_click_plan_tb
    (nombre, descripcion, precio_mensual, precio_usd, comision_porcentaje,
     max_usuarios, max_productos, max_bodegas, max_cajas,
     tiene_pos, tiene_crm, tiene_compras, tiene_reportes, tiene_ai, tiene_api,
     max_creditos_ai, activo)
VALUES
    ('NEGOCIO_PLUS',
     'Plan completo. Usuarios ilimitados, IA sin límite.',
     0, 19.99, 0.00,
     -1, -1, -1, -1,
     true, true, true, true, true, false,
     -1, true)
ON CONFLICT (nombre) DO UPDATE SET
    descripcion          = EXCLUDED.descripcion,
    precio_usd           = EXCLUDED.precio_usd,
    comision_porcentaje  = EXCLUDED.comision_porcentaje,
    max_usuarios         = EXCLUDED.max_usuarios,
    max_productos        = EXCLUDED.max_productos,
    max_bodegas          = EXCLUDED.max_bodegas,
    max_cajas            = EXCLUDED.max_cajas,
    tiene_pos            = EXCLUDED.tiene_pos,
    tiene_crm            = EXCLUDED.tiene_crm,
    tiene_compras        = EXCLUDED.tiene_compras,
    tiene_reportes       = EXCLUDED.tiene_reportes,
    tiene_ai             = EXCLUDED.tiene_ai,
    tiene_api            = EXCLUDED.tiene_api,
    max_creditos_ai      = EXCLUDED.max_creditos_ai,
    activo               = EXCLUDED.activo;

-- ══════════════════════════════════════════════════════════
-- 4. MIGRAR EMPRESAS al plan EMPRENDEDOR (el que corresponde al antiguo FREE)
--    Empresas en planes premium se quedan donde están hasta que expiren
-- ══════════════════════════════════════════════════════════
UPDATE hot_click_empresa_tb
SET fk_id_plan = (SELECT id_plan FROM hot_click_plan_tb WHERE nombre = 'EMPRENDEDOR')
WHERE fk_id_plan IS NULL
   OR fk_id_plan IN (
       SELECT id_plan FROM hot_click_plan_tb
       WHERE nombre IN ('FREE', 'Inicio Ferial')
   );
