-- V133: comisión Tilopay absorbida en precio + descuento SINPE opcional por empresa
ALTER TABLE hot_click_empresa_tb
    ADD COLUMN IF NOT EXISTS pct_comision_tarjeta NUMERIC(5,2) NOT NULL DEFAULT 4.80;

ALTER TABLE hot_click_empresa_tb
    ADD COLUMN IF NOT EXISTS monto_fijo_comision_crc INTEGER NOT NULL DEFAULT 200;

ALTER TABLE hot_click_empresa_tb
    ADD COLUMN IF NOT EXISTS pct_descuento_sinpe NUMERIC(5,2) NOT NULL DEFAULT 0;
