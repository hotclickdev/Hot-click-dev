-- V8: Tabla empresa (tenant), rol EMPRENDEDOR, permisos RBAC
-- Idempotente: usa IF NOT EXISTS y ON CONFLICT DO NOTHING en todo

CREATE TABLE IF NOT EXISTS hot_click_empresa_tb (
    id_empresa          BIGSERIAL     PRIMARY KEY,
    nombre_empresa      VARCHAR(200)  NOT NULL,
    nombre_comercial    VARCHAR(200),
    slug                VARCHAR(100)  UNIQUE NOT NULL,
    ruc_cedula          VARCHAR(30),
    correo_empresa      VARCHAR(150)  UNIQUE NOT NULL,
    telefono_empresa    VARCHAR(30),
    logo_url            VARCHAR(500),
    color_primario      VARCHAR(7)    DEFAULT '#FF4B12',
    color_secundario    VARCHAR(7)    DEFAULT '#1A1A2E',
    moneda_defecto      VARCHAR(3)    DEFAULT 'CRC',
    pais_operacion      VARCHAR(3)    DEFAULT 'CRC',
    plan_saas           VARCHAR(30)   NOT NULL DEFAULT 'GRATUITO',
    estado_empresa      VARCHAR(20)   NOT NULL DEFAULT 'ACTIVO',
    fecha_registro      TIMESTAMP     NOT NULL DEFAULT NOW(),
    fecha_aprobacion    TIMESTAMP,
    aprobado_por        BIGINT,
    numero_whatsapp     VARCHAR(30),
    descripcion         TEXT,
    fk_id_estado        INTEGER       NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_empresa_estado ON hot_click_empresa_tb (estado_empresa);
CREATE INDEX IF NOT EXISTS idx_empresa_slug   ON hot_click_empresa_tb (slug);

INSERT INTO hot_click_empresa_tb (
    id_empresa, nombre_empresa, nombre_comercial, slug,
    correo_empresa, plan_saas, estado_empresa, fecha_aprobacion
) VALUES (
    1, 'HOTCLICK', 'HOT CLICK OUTLET', 'hotclick',
    'admin@hotclick.com', 'ENTERPRISE', 'ACTIVO', NOW()
) ON CONFLICT (id_empresa) DO NOTHING;

ALTER TABLE hot_click_usuario_tb
    ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT
        REFERENCES hot_click_empresa_tb(id_empresa);

UPDATE hot_click_usuario_tb SET fk_id_empresa = 1 WHERE id_usuario = 1 AND fk_id_empresa IS NULL;

INSERT INTO "HOT_CLICK_ROL_TB" ("ID_ROL", "NOMBRE_ROL", "DESCRIPCION", "NIVEL_ACCESO") VALUES
  (4, 'EMPRENDEDOR', 'Dueño de empresa — acceso total a SU tenant', 7)
ON CONFLICT ("ID_ROL") DO NOTHING;

CREATE TABLE IF NOT EXISTS hot_click_empresa_config_tb (
    id_config           BIGSERIAL    PRIMARY KEY,
    fk_id_empresa       BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    clave               VARCHAR(100) NOT NULL,
    valor               TEXT,
    tipo                VARCHAR(20)  DEFAULT 'STRING',
    descripcion         VARCHAR(200),
    es_secreto          BOOLEAN      DEFAULT false,
    fecha_actualizacion TIMESTAMP    DEFAULT NOW(),
    UNIQUE (fk_id_empresa, clave)
);

CREATE INDEX IF NOT EXISTS idx_empresa_config ON hot_click_empresa_config_tb (fk_id_empresa, clave);

INSERT INTO "HOT_CLICK_PERMISO_TB" ("NOMBRE_PERMISO", "DESCRIPCION", "MODULO") VALUES
  ('products.view',       'Ver productos',             'PRODUCTOS'),
  ('products.create',     'Crear productos',           'PRODUCTOS'),
  ('products.update',     'Editar productos',          'PRODUCTOS'),
  ('products.delete',     'Solicitar borrar producto', 'PRODUCTOS'),
  ('orders.view',         'Ver pedidos',               'PEDIDOS'),
  ('orders.update',       'Actualizar estado pedido',  'PEDIDOS'),
  ('orders.export',       'Exportar pedidos',          'PEDIDOS'),
  ('finances.view',       'Ver finanzas',              'FINANZAS'),
  ('finances.export',     'Exportar finanzas',         'FINANZAS'),
  ('reports.view',        'Ver reportes',              'REPORTES'),
  ('reports.export',      'Exportar reportes',         'REPORTES'),
  ('users.view',          'Ver usuarios empresa',      'USUARIOS'),
  ('users.manage',        'Crear/editar usuarios',     'USUARIOS'),
  ('settings.view',       'Ver configuración empresa', 'CONFIGURACION'),
  ('settings.edit',       'Editar configuración',      'CONFIGURACION'),
  ('webhooks.manage',     'Gestionar webhooks',        'INTEGRACIONES'),
  ('warehouses.manage',   'Gestionar bodegas',         'BODEGAS'),
  ('brands.manage',       'Gestionar marcas',          'MARCAS'),
  ('categories.manage',   'Gestionar categorías',      'CATEGORIAS'),
  ('ai.use',              'Usar herramientas IA',      'IA'),
  ('publications.manage', 'Gestionar publicaciones',   'PUBLICACIONES'),
  ('services.view',       'Ver servicios HOT',         'SERVICIOS'),
  ('global.companies',    'Ver todas las empresas',    'GLOBAL'),
  ('global.approvals',    'Aprobar solicitudes',       'GLOBAL'),
  ('global.metrics',      'Métricas globales',         'GLOBAL')
ON CONFLICT ("NOMBRE_PERMISO") DO NOTHING;

INSERT INTO "HOT_CLICK_ROL_PERMISO_TB" ("FK_ID_ROL", "FK_ID_PERMISO")
SELECT 1, "ID_PERMISO" FROM "HOT_CLICK_PERMISO_TB"
ON CONFLICT DO NOTHING;

INSERT INTO "HOT_CLICK_ROL_PERMISO_TB" ("FK_ID_ROL", "FK_ID_PERMISO")
SELECT 4, "ID_PERMISO" FROM "HOT_CLICK_PERMISO_TB"
WHERE "NOMBRE_PERMISO" NOT LIKE 'global.%'
ON CONFLICT DO NOTHING;

INSERT INTO "HOT_CLICK_ROL_PERMISO_TB" ("FK_ID_ROL", "FK_ID_PERMISO")
SELECT 2, "ID_PERMISO" FROM "HOT_CLICK_PERMISO_TB"
WHERE "NOMBRE_PERMISO" IN (
    'products.view','products.create','products.update',
    'orders.view','orders.update',
    'finances.view','reports.view',
    'warehouses.manage','brands.manage','categories.manage'
)
ON CONFLICT DO NOTHING;
