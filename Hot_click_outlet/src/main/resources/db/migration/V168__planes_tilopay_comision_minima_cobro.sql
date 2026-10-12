-- Planes decididos por HOT_CLICK (finanzas/planes_pendientes.md, 12-oct-2026).
-- Solo montos decididos. La mensualidad de Emprendedor desde el negocio 71 queda sin monto (configuración).

ALTER TABLE hot_click_plan_tb ADD COLUMN IF NOT EXISTS comision_minima_crc INTEGER NOT NULL DEFAULT 0;

UPDATE hot_click_plan_tb SET precio_mensual = 0,     comision_porcentaje = 9.00, comision_minima_crc = 700, activo = true,
       descripcion = 'Comisión 9% por venta (mínimo ₡700). Sin mensualidad para los primeros 70 negocios.'
 WHERE nombre = 'EMPRENDEDOR';
UPDATE hot_click_plan_tb SET precio_mensual = 12900, comision_porcentaje = 7.00, comision_minima_crc = 700, activo = true,
       descripcion = '₡12.900 al mes + 7% por venta (mínimo ₡700).'
 WHERE nombre = 'PYME';
UPDATE hot_click_plan_tb SET precio_mensual = 28900, comision_porcentaje = 7.00, comision_minima_crc = 700, activo = true,
       descripcion = '₡28.900 al mes + 7% por venta sin tope (mínimo ₡700).'
 WHERE nombre = 'NEGOCIO_PLUS';

-- Cobro de la mensualidad: día 28 (por defecto) o 13. Pago a vendedores: QUINCENAL o MENSUAL.
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS dia_cobro SMALLINT NOT NULL DEFAULT 28;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS frecuencia_payout VARCHAR(10) NOT NULL DEFAULT 'QUINCENAL';
ALTER TABLE hot_click_empresa_tb DROP CONSTRAINT IF EXISTS ck_empresa_dia_cobro;
ALTER TABLE hot_click_empresa_tb ADD CONSTRAINT ck_empresa_dia_cobro CHECK (dia_cobro IN (13, 28));
ALTER TABLE hot_click_empresa_tb DROP CONSTRAINT IF EXISTS ck_empresa_frecuencia_payout;
ALTER TABLE hot_click_empresa_tb ADD CONSTRAINT ck_empresa_frecuencia_payout CHECK (frecuencia_payout IN ('QUINCENAL', 'MENSUAL'));

-- Negocios en prueba y en planes que ya no existen (p. ej. "PRO", id 2) pasan a EMPRENDEDOR, gratis.
UPDATE hot_click_empresa_tb e
   SET fk_id_plan = p.id_plan, plan_saas = 'EMPRENDEDOR', estado_plan = 'ACTIVO'
  FROM hot_click_plan_tb p
 WHERE p.nombre = 'EMPRENDEDOR'
   AND (e.estado_plan = 'TRIAL'
        OR e.fk_id_plan IS NULL
        OR e.fk_id_plan NOT IN (SELECT id_plan FROM hot_click_plan_tb WHERE nombre IN ('EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS')));
UPDATE hot_click_suscripcion_tb s
   SET fk_id_plan = p.id_plan, estado = 'ACTIVO'
  FROM hot_click_plan_tb p
 WHERE p.nombre = 'EMPRENDEDOR'
   AND (s.estado = 'TRIAL'
        OR s.fk_id_plan NOT IN (SELECT id_plan FROM hot_click_plan_tb WHERE nombre IN ('EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS')));

-- Negocios que quedaron esperando membresía por falta de cupo: mientras la mensualidad de Emprendedor
-- desde el negocio 71 no tenga monto, no hay nada que cobrar y quedan activos.
-- (decisión 12-oct) y recuperan la visibilidad pública que les apagó el bloqueo.
UPDATE hot_click_empresa_tb SET estado_plan = 'ACTIVO', visibilidad_publica = true WHERE estado_plan = 'REQUIERE_MEMBRESIA';
