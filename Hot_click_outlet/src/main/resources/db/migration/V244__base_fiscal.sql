-- La fila id=1 no se siembra: sin ella el servicio usa los valores por defecto y la crea al primer guardado.
-- V244 (Fase 1 "Base fiscal"): reglas fiscales de la plataforma (fila única id=1, editables por ADMIN)
-- y situación fiscal por negocio. Aditiva e idempotente: no borra ni reescribe datos existentes.
CREATE TABLE IF NOT EXISTS hot_click_config_fiscal_tb (
    id BIGINT PRIMARY KEY,
    regimen_hotclick VARCHAR(20) NOT NULL DEFAULT 'SIMPLIFICADO',
    extra_no_inscrito_pct NUMERIC(5,2) NOT NULL DEFAULT 14.00,
    dias_enviar_factura INTEGER NOT NULL DEFAULT 7,
    onvo_pago_minimo_crc INTEGER NOT NULL DEFAULT 20000,
    onvo_costo_pago_crc INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT ck_config_fiscal_regimen CHECK (regimen_hotclick IN ('SIMPLIFICADO', 'TRADICIONAL')),
    CONSTRAINT ck_config_fiscal_extra CHECK (extra_no_inscrito_pct BETWEEN 0 AND 50),
    CONSTRAINT ck_config_fiscal_dias CHECK (dias_enviar_factura BETWEEN 1 AND 60),
    CONSTRAINT ck_config_fiscal_minimo CHECK (onvo_pago_minimo_crc BETWEEN 0 AND 10000000),
    CONSTRAINT ck_config_fiscal_costo CHECK (onvo_costo_pago_crc BETWEEN 0 AND 100000)
);

-- Situación fiscal del negocio. NULL = sin declarar: paga el extra igual que NO_INSCRITO.
-- Valores: INSCRITO | REGIMEN_SIMPLIFICADO | NO_INSCRITO (validado en la aplicación).
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS situacion_fiscal VARCHAR(25);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS cedula_fiscal VARCHAR(12);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS nombre_fiscal VARCHAR(150);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS actividad_fiscal VARCHAR(150);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS correo_facturacion VARCHAR(150);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS fecha_situacion_fiscal TIMESTAMP;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS fiscal_verificado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS fiscal_verificado_por BIGINT;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS fecha_fiscal_verificado TIMESTAMP;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS fiscal_verif_auto VARCHAR(20);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS fiscal_verif_auto_detalle VARCHAR(2000);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS fiscal_verif_auto_fecha TIMESTAMP;
-- Declaración jurada: quién aceptó ser representante o autorizado y que los datos son verdaderos, y cuándo (sin IP).
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS fiscal_declaracion_fecha TIMESTAMP;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS fiscal_declaracion_por BIGINT;
