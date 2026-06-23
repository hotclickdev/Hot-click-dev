-- V84: Sistema de cotizaciones B2B profesional
-- Compatibilidad Hacienda CR (régimen simplificado) + factura electrónica futura

-- 1. Clientes B2B
CREATE TABLE IF NOT EXISTS hot_click_cotizacion_cliente_tb (
    id                  BIGSERIAL PRIMARY KEY,
    empresa_id          BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
    nombre_comercial    VARCHAR(200) NOT NULL,
    razon_social        VARCHAR(200),
    cedula_juridica     VARCHAR(20),
    correo              VARCHAR(150),
    telefono            VARCHAR(20),
    direccion           TEXT,
    contacto_principal  VARCHAR(150),
    fk_id_estado        INTEGER NOT NULL DEFAULT 1,
    fecha_creacion      TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- 2. Consecutivo por empresa (UPDATE ... RETURNING — PgBouncer-safe)
CREATE TABLE IF NOT EXISTS hot_click_cotizacion_consecutivo_tb (
    empresa_id     BIGINT PRIMARY KEY,
    ultimo_numero  BIGINT NOT NULL DEFAULT 0
);

-- 3. Extender tabla existente de cotizaciones con campos B2B
ALTER TABLE hot_click_cotizacion_tb
    ADD COLUMN IF NOT EXISTS empresa_id          BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
    ADD COLUMN IF NOT EXISTS cliente_id          BIGINT REFERENCES hot_click_cotizacion_cliente_tb(id),
    ADD COLUMN IF NOT EXISTS numero_cotizacion   VARCHAR(30),
    ADD COLUMN IF NOT EXISTS fecha_emision       DATE,
    ADD COLUMN IF NOT EXISTS fecha_vencimiento   DATE,
    ADD COLUMN IF NOT EXISTS estado_cotizacion   VARCHAR(30) DEFAULT 'BORRADOR',
    ADD COLUMN IF NOT EXISTS aplica_iva          BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS porcentaje_iva      INTEGER DEFAULT 13,
    ADD COLUMN IF NOT EXISTS subtotal            INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS monto_iva           INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS observaciones       TEXT,
    ADD COLUMN IF NOT EXISTS terminos            TEXT,
    ADD COLUMN IF NOT EXISTS token_publico       UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS moneda              VARCHAR(10) DEFAULT 'CRC';

-- 4. Ítems de cotización
CREATE TABLE IF NOT EXISTS hot_click_cotizacion_item_tb (
    id                   BIGSERIAL PRIMARY KEY,
    cotizacion_id        BIGINT NOT NULL REFERENCES hot_click_cotizacion_tb(id_cotizacion) ON DELETE CASCADE,
    tipo                 VARCHAR(20) NOT NULL DEFAULT 'CATALOGO',  -- CATALOGO | TEMPORAL
    producto_id          BIGINT REFERENCES hot_click_producto_tb(id_producto),
    codigo               VARCHAR(50),
    nombre               VARCHAR(200) NOT NULL,
    descripcion          TEXT,
    imagen_url           TEXT,
    cantidad             INTEGER NOT NULL DEFAULT 1,
    unidad_medida        VARCHAR(30) DEFAULT 'UNIDAD',
    precio_unitario      INTEGER NOT NULL DEFAULT 0,
    descuento_porcentaje INTEGER DEFAULT 0,
    subtotal_linea       INTEGER NOT NULL DEFAULT 0,
    orden                INTEGER DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cot_cliente_empresa  ON hot_click_cotizacion_cliente_tb(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cot_empresa          ON hot_click_cotizacion_tb(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cot_estado           ON hot_click_cotizacion_tb(estado_cotizacion);
CREATE INDEX IF NOT EXISTS idx_cot_item_cot         ON hot_click_cotizacion_item_tb(cotizacion_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cot_token      ON hot_click_cotizacion_tb(token_publico);
