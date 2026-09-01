-- V110: presupuesto opcional del cliente y mensaje del vendedor al aprobar

ALTER TABLE hot_click_encargo_tb
    ADD COLUMN IF NOT EXISTS presupuesto_tipo VARCHAR(20) NOT NULL DEFAULT 'SIN_PRESUPUESTO';

ALTER TABLE hot_click_encargo_tb
    ADD COLUMN IF NOT EXISTS presupuesto_min INTEGER;

ALTER TABLE hot_click_encargo_tb
    ADD COLUMN IF NOT EXISTS presupuesto_max INTEGER;

ALTER TABLE hot_click_encargo_tb
    ADD COLUMN IF NOT EXISTS mensaje_vendedor TEXT;
