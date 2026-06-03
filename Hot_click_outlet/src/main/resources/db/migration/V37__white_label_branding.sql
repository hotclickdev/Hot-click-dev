-- F18: White label branding — extend empresa with branding fields
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS color_acento      VARCHAR(7)   DEFAULT '#4f7cff';
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS tagline           VARCHAR(200);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS footer_texto      VARCHAR(500);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS font_familia      VARCHAR(50)  DEFAULT 'Inter';
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS favicon_url       VARCHAR(500);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS og_imagen_url     VARCHAR(500);
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS dominio_custom    VARCHAR(200);
