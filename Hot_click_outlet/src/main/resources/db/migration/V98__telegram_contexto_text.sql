-- V98: contexto de la vinculación de Telegram pasa a TEXT.
-- Los flujos multi-paso del bot (venta rápida, alta de producto, clientes)
-- guardan un borrador JSON que no cabe en VARCHAR(64).
ALTER TABLE hot_click_telegram_vinculacion_tb ALTER COLUMN contexto TYPE TEXT;
