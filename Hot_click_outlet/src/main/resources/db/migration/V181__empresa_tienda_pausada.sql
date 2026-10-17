-- Pausa de tienda (la tienda pública responde 410 TIENDA_PAUSADA y sale de destacados). Aditiva.
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS tienda_pausada BOOLEAN NOT NULL DEFAULT FALSE;
