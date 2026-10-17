-- Carrusel del inicio (HANDOFF 16-oct-2026): negocio destacado curado por el superadmin.
-- Solo columnas nuevas con default: no reescribe datos existentes.
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS destacado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS destacado_orden INT;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS destacado_desde TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_empresa_destacado ON hot_click_empresa_tb (destacado_orden, destacado_desde) WHERE destacado = TRUE;
