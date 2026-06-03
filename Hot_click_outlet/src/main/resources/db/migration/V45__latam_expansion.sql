-- F25: LATAM Expansion — multi-country, multi-currency display
-- pais_operacion and moneda_defecto already exist in empresa; add billing-specific fields
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS moneda_facturacion VARCHAR(3) DEFAULT 'CRC';
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS tax_rate_pct       NUMERIC(5,2) DEFAULT 13.00;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS locale_codigo      VARCHAR(10) DEFAULT 'es-CR';

-- Exchange rate reference (manual update, display only — not for transaction amounts)
CREATE TABLE IF NOT EXISTS hot_click_tasa_cambio_tb (
    id_tasa       BIGSERIAL    PRIMARY KEY,
    moneda_desde  VARCHAR(3)   NOT NULL DEFAULT 'CRC',
    moneda_hacia  VARCHAR(3)   NOT NULL,
    tasa          NUMERIC(15,6) NOT NULL,
    fecha_vigencia DATE        NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (moneda_desde, moneda_hacia, fecha_vigencia)
);

-- Seed common LATAM exchange rates (approximate, display only)
INSERT INTO hot_click_tasa_cambio_tb (moneda_desde, moneda_hacia, tasa) VALUES
  ('CRC','USD', 0.00193),
  ('CRC','EUR', 0.00177),
  ('CRC','MXN', 0.03300),
  ('CRC','COP', 7.86000),
  ('CRC','PEN', 0.00725),
  ('CRC','GTQ', 0.01506),
  ('CRC','HNL', 0.04740)
ON CONFLICT (moneda_desde, moneda_hacia, fecha_vigencia) DO NOTHING;
