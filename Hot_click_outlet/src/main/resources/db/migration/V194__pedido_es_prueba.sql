-- P-04 (C3): pedido cobrado con llave ONVO de prueba (mode=test) queda marcado. Aditiva: columna nueva con default.
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS es_prueba BOOLEAN NOT NULL DEFAULT FALSE;
