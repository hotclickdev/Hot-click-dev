-- V33: F12 Facturación Electrónica Costa Rica (Hacienda XML 4.3)

-- ============================================================
-- Consecutivo fiscal por empresa+tipo — generación segura sin advisory locks
-- El campo ultimo_numero se actualiza con UPDATE atómico dentro de una
-- transacción corta y separada del call HTTP a Hacienda.
-- Compatible con PgBouncer transaction mode.
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_consecutivo_fiscal_tb (
    fk_id_empresa  BIGINT      NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    tipo           VARCHAR(2)  NOT NULL,    -- '01'=Factura, '04'=Tiquete, '02'=NDebito, '03'=NCredito
    ultimo_numero  BIGINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (fk_id_empresa, tipo)
);

-- Consecutivos iniciales para empresa 1 (HOTCLICK)
INSERT INTO hot_click_consecutivo_fiscal_tb (fk_id_empresa, tipo, ultimo_numero)
VALUES (1, '01', 0), (1, '04', 0), (1, '02', 0), (1, '03', 0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Comprobantes fiscales emitidos
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_comprobante_fiscal_tb (
    id_comprobante      BIGSERIAL     PRIMARY KEY,
    fk_id_empresa       BIGINT        NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_pedido        BIGINT        REFERENCES hot_click_pedido_tb(id_pedido),
    tipo                VARCHAR(2)    NOT NULL DEFAULT '04',  -- '01'=Factura, '04'=Tiquete
    clave_numerica      VARCHAR(50)   UNIQUE NOT NULL,
    numero_consecutivo  VARCHAR(20),
    estado              VARCHAR(20)   NOT NULL DEFAULT 'PENDIENTE',
    -- PENDIENTE → ENVIADO → ACEPTADO | RECHAZADO | ERROR
    ambiente            VARCHAR(4)    NOT NULL DEFAULT 'STAG',  -- STAG | PROD
    xml_path            VARCHAR(500),   -- path en Supabase Storage (no guardar XML inline)
    xml_respuesta_path  VARCHAR(500),
    mensaje_hacienda    TEXT,
    fecha_emision       TIMESTAMP     NOT NULL DEFAULT NOW(),
    fecha_respuesta     TIMESTAMP,
    referencia_id       BIGINT,         -- para notas: id del comprobante original
    total_neto          INTEGER,
    total_impuesto      INTEGER,
    total_factura       INTEGER,
    moneda              VARCHAR(3)    DEFAULT 'CRC',
    receptor_cedula     VARCHAR(20),
    receptor_tipo       VARCHAR(2),     -- '01'=Física, '02'=Jurídica, '03'=DIMEX, '04'=NITE
    receptor_nombre     VARCHAR(200),
    receptor_correo     VARCHAR(200),
    intentos_envio      INTEGER       DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_comprobante_empresa ON hot_click_comprobante_fiscal_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_comprobante_pedido  ON hot_click_comprobante_fiscal_tb (fk_id_pedido);
CREATE INDEX IF NOT EXISTS idx_comprobante_estado  ON hot_click_comprobante_fiscal_tb (estado);
CREATE INDEX IF NOT EXISTS idx_comprobante_clave   ON hot_click_comprobante_fiscal_tb (clave_numerica);

-- ============================================================
-- Configuración fiscal por empresa
-- ============================================================
ALTER TABLE hot_click_empresa_tb
    ADD COLUMN IF NOT EXISTS cedula_juridica      VARCHAR(20),
    ADD COLUMN IF NOT EXISTS tipo_cedula          VARCHAR(2)  DEFAULT '02',  -- '01'=Física,'02'=Jurídica
    ADD COLUMN IF NOT EXISTS actividad_economica  VARCHAR(10),
    ADD COLUMN IF NOT EXISTS nombre_comercial_fe  VARCHAR(200),
    ADD COLUMN IF NOT EXISTS usuario_hacienda     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS clave_hacienda_enc   TEXT,   -- AES-256 cifrado
    ADD COLUMN IF NOT EXISTS cert_p12_path        VARCHAR(500),
    ADD COLUMN IF NOT EXISTS pin_cert_enc         TEXT,   -- AES-256 cifrado
    ADD COLUMN IF NOT EXISTS ambiente_hacienda    VARCHAR(4) DEFAULT 'STAG';  -- STAG | PROD

-- ============================================================
-- IVA por producto — crítico para XML válido de Hacienda
-- Tarifa 08 = 13% (general), 04 = 4%, 02 = 2%, 01 = 0% (exento)
-- ============================================================
ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS porcentaje_iva    NUMERIC(5,2) DEFAULT 13.00,
    ADD COLUMN IF NOT EXISTS codigo_tarifa_iva VARCHAR(2)   DEFAULT '08';
