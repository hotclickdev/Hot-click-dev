-- Pausa de cobros en línea del negocio (lado HotClick). Aditiva: no borra ni modifica datos.
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS cobros_pausados BOOLEAN NOT NULL DEFAULT FALSE;
