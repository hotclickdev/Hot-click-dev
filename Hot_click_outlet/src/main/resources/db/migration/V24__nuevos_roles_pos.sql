-- ============================================================
-- V24: Nuevos roles empresariales + permisos del módulo POS
--
-- NOTA: hot_click_permiso_tb y hot_click_rol_permiso_tb pueden
-- existir como "HOT_CLICK_PERMISO_TB" (uppercase, creado por V1).
-- Este script las crea en lowercase si no existen, unificando
-- el naming hacia minúsculas como el resto del sistema.
-- ============================================================

-- ── Tablas de permisos (crear en lowercase si no existen) ────
CREATE TABLE IF NOT EXISTS hot_click_permiso_tb (
  id_permiso     SERIAL       PRIMARY KEY,
  nombre_permiso VARCHAR(50)  UNIQUE NOT NULL,
  descripcion    VARCHAR(200),
  modulo         VARCHAR(30)  NOT NULL,
  fk_id_estado   INTEGER      NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS hot_click_rol_permiso_tb (
  fk_id_rol      INTEGER NOT NULL REFERENCES hot_click_rol_tb(id_rol),
  fk_id_permiso  INTEGER NOT NULL REFERENCES hot_click_permiso_tb(id_permiso),
  fk_id_estado   INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (fk_id_rol, fk_id_permiso)
);

-- ── Roles nuevos ─────────────────────────────────────────────
INSERT INTO hot_click_rol_tb (id_rol, nombre_rol, descripcion, nivel_acceso) VALUES
  (5,  'CAJERO',        'Operador de caja — acceso solo al POS',         3),
  (6,  'INVENTARIO',    'Gestión de productos, stock y bodegas',         4),
  (7,  'CONTABILIDAD',  'Acceso a finanzas y reportes',                  4),
  (8,  'GERENTE',       'Supervisor general de operaciones',             6),
  (9,  'SUPERVISOR',    'Supervisión de turnos y caja POS',              5),
  (10, 'MARKETING',     'Gestión de contenido y publicaciones',          3),
  (11, 'SOPORTE',       'Atención al cliente y gestión de pedidos',      2)
ON CONFLICT (id_rol) DO NOTHING;

-- Avanzar la secuencia para que futuros auto-inserts no colisionen
SELECT setval(
  pg_get_serial_sequence('hot_click_rol_tb', 'id_rol'),
  GREATEST((SELECT MAX(id_rol) FROM hot_click_rol_tb) + 1, 20)
);

-- ── Permisos base del sistema ────────────────────────────────
-- (Los de V8 pueden estar en la tabla uppercase; los reinsertamos
--  en la lowercase para tener una fuente de verdad unificada.)
INSERT INTO hot_click_permiso_tb (nombre_permiso, descripcion, modulo) VALUES
  ('products.view',       'Ver productos',                        'PRODUCTOS'),
  ('products.create',     'Crear productos',                      'PRODUCTOS'),
  ('products.update',     'Editar productos',                     'PRODUCTOS'),
  ('products.delete',     'Solicitar borrar producto',            'PRODUCTOS'),
  ('orders.view',         'Ver pedidos',                          'PEDIDOS'),
  ('orders.update',       'Actualizar estado pedido',             'PEDIDOS'),
  ('orders.export',       'Exportar pedidos',                     'PEDIDOS'),
  ('finances.view',       'Ver finanzas',                         'FINANZAS'),
  ('finances.export',     'Exportar finanzas',                    'FINANZAS'),
  ('reports.view',        'Ver reportes',                         'REPORTES'),
  ('reports.export',      'Exportar reportes',                    'REPORTES'),
  ('users.view',          'Ver usuarios empresa',                 'USUARIOS'),
  ('users.manage',        'Crear/editar usuarios',                'USUARIOS'),
  ('settings.view',       'Ver configuración empresa',            'CONFIGURACION'),
  ('settings.edit',       'Editar configuración',                 'CONFIGURACION'),
  ('warehouses.manage',   'Gestionar bodegas',                    'BODEGAS'),
  ('brands.manage',       'Gestionar marcas',                     'MARCAS'),
  ('categories.manage',   'Gestionar categorías',                 'CATEGORIAS'),
  ('publications.manage', 'Gestionar publicaciones',              'PUBLICACIONES'),
  ('global.companies',    'Ver todas las empresas',               'GLOBAL'),
  ('global.approvals',    'Aprobar solicitudes',                  'GLOBAL'),
  ('global.metrics',      'Métricas globales',                    'GLOBAL'),
  -- Permisos POS nuevos
  ('pos.usar',            'Operar el POS — pantalla de caja',     'POS'),
  ('pos.caja.abrir',      'Abrir turno de caja',                  'POS'),
  ('pos.caja.cerrar',     'Cerrar turno de caja y cuadre',        'POS'),
  ('pos.anular',          'Anular una venta POS ya registrada',   'POS'),
  ('pos.devolucion',      'Procesar devolución desde el POS',     'POS'),
  ('pos.descuento',       'Aplicar descuento manual en caja',     'POS')
ON CONFLICT (nombre_permiso) DO NOTHING;

-- ── Permisos para ADMIN_IT (rol 1) — todo ────────────────────
INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT 1, id_permiso FROM hot_click_permiso_tb
ON CONFLICT DO NOTHING;

-- ── Permisos para ADMIN_CLIENTE (rol 2) ──────────────────────
INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT 2, id_permiso FROM hot_click_permiso_tb
WHERE nombre_permiso IN (
  'products.view','products.create','products.update',
  'orders.view','orders.update','orders.export',
  'finances.view','finances.export',
  'reports.view','reports.export',
  'users.view','users.manage',
  'settings.view','settings.edit',
  'warehouses.manage','brands.manage','categories.manage',
  'publications.manage',
  'pos.usar','pos.caja.abrir','pos.caja.cerrar',
  'pos.anular','pos.devolucion','pos.descuento'
)
ON CONFLICT DO NOTHING;

-- ── Permisos para EMPRENDEDOR (rol 4) ────────────────────────
INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT 4, id_permiso FROM hot_click_permiso_tb
WHERE nombre_permiso NOT LIKE 'global.%'
ON CONFLICT DO NOTHING;

-- ── CAJERO (rol 5): solo operar POS ──────────────────────────
INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT 5, id_permiso FROM hot_click_permiso_tb
WHERE nombre_permiso IN (
  'pos.usar','pos.caja.abrir','pos.caja.cerrar','pos.descuento',
  'products.view','orders.view'
)
ON CONFLICT DO NOTHING;

-- ── INVENTARIO (rol 6) ────────────────────────────────────────
INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT 6, id_permiso FROM hot_click_permiso_tb
WHERE nombre_permiso IN (
  'products.view','products.create','products.update',
  'warehouses.manage','brands.manage','categories.manage'
)
ON CONFLICT DO NOTHING;

-- ── CONTABILIDAD (rol 7) ──────────────────────────────────────
INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT 7, id_permiso FROM hot_click_permiso_tb
WHERE nombre_permiso IN (
  'finances.view','finances.export',
  'reports.view','reports.export',
  'orders.view','orders.export'
)
ON CONFLICT DO NOTHING;

-- ── GERENTE (rol 8): todo excepto global ─────────────────────
INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT 8, id_permiso FROM hot_click_permiso_tb
WHERE nombre_permiso NOT LIKE 'global.%'
ON CONFLICT DO NOTHING;

-- ── SUPERVISOR (rol 9): POS completo + pedidos + inventario ──
INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT 9, id_permiso FROM hot_click_permiso_tb
WHERE nombre_permiso IN (
  'pos.usar','pos.caja.abrir','pos.caja.cerrar',
  'pos.anular','pos.devolucion','pos.descuento',
  'orders.view','orders.update',
  'products.view','warehouses.manage'
)
ON CONFLICT DO NOTHING;

-- ── MARKETING (rol 10) ────────────────────────────────────────
INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT 10, id_permiso FROM hot_click_permiso_tb
WHERE nombre_permiso IN (
  'products.view','products.create','products.update',
  'publications.manage'
)
ON CONFLICT DO NOTHING;

-- ── SOPORTE (rol 11) ──────────────────────────────────────────
INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT 11, id_permiso FROM hot_click_permiso_tb
WHERE nombre_permiso IN ('orders.view','users.view')
ON CONFLICT DO NOTHING;
