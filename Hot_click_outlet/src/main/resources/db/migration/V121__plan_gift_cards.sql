-- V121: gate de Gift Cards por plan (PYME y NEGOCIO_PLUS, no EMPRENDEDOR)
ALTER TABLE hot_click_plan_tb ADD COLUMN IF NOT EXISTS tiene_gift_cards BOOLEAN NOT NULL DEFAULT false;

UPDATE hot_click_plan_tb SET tiene_gift_cards = true WHERE nombre IN ('PYME', 'NEGOCIO_PLUS');
