-- V31: F10 Multi-tenant SaaS — Plan system + campos de tenant en empresa

-- ============================================================
-- Tabla de planes SaaS
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_plan_tb (
    id_plan          BIGSERIAL    PRIMARY KEY,
    nombre           VARCHAR(50)  NOT NULL UNIQUE,
    descripcion      TEXT,
    precio_mensual   INTEGER      NOT NULL DEFAULT 0,
    max_usuarios     INTEGER      NOT NULL DEFAULT 2,
    max_productos    INTEGER      NOT NULL DEFAULT 50,
    max_bodegas      INTEGER      NOT NULL DEFAULT 1,
    max_cajas        INTEGER      NOT NULL DEFAULT 1,
    tiene_pos        BOOLEAN      NOT NULL DEFAULT FALSE,
    tiene_crm        BOOLEAN      NOT NULL DEFAULT FALSE,
    tiene_compras    BOOLEAN      NOT NULL DEFAULT FALSE,
    tiene_reportes   BOOLEAN      NOT NULL DEFAULT FALSE,
    tiene_ai         BOOLEAN      NOT NULL DEFAULT FALSE,
    tiene_api        BOOLEAN      NOT NULL DEFAULT FALSE,
    activo           BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Planes seed
INSERT INTO hot_click_plan_tb
    (nombre, descripcion, precio_mensual,
     max_usuarios, max_productos, max_bodegas, max_cajas,
     tiene_pos, tiene_crm, tiene_compras, tiene_reportes, tiene_ai, tiene_api)
VALUES
    ('FREE',       'Plan gratuito',      0,
     2,  50,  1, 1, false, false, false, false, false, false),
    ('PRO',        'Plan profesional',   19900,
     10, 500, 2, 3, true,  true,  true,  true,  false, false),
    ('ENTERPRISE', 'Plan empresarial',   49900,
     50, -1,  5, 10, true,  true,  true,  true,  true,  true)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- Enriquecer empresa con metadata de tenant SaaS
-- ============================================================
ALTER TABLE hot_click_empresa_tb
    ADD COLUMN IF NOT EXISTS fk_id_plan      BIGINT
        REFERENCES hot_click_plan_tb(id_plan),
    ADD COLUMN IF NOT EXISTS estado_plan     VARCHAR(20) DEFAULT 'ACTIVO',
    ADD COLUMN IF NOT EXISTS fecha_venc_plan DATE,
    ADD COLUMN IF NOT EXISTS trial_hasta     DATE,
    ADD COLUMN IF NOT EXISTS timezone        VARCHAR(50) DEFAULT 'America/Costa_Rica';

-- Backfill: asignar plan FREE a todas las empresas existentes
UPDATE hot_click_empresa_tb
SET fk_id_plan  = (SELECT id_plan FROM hot_click_plan_tb WHERE nombre = 'FREE'),
    estado_plan = 'ACTIVO'
WHERE fk_id_plan IS NULL;

-- Índice de performance
CREATE INDEX IF NOT EXISTS idx_empresa_plan ON hot_click_empresa_tb (fk_id_plan);
