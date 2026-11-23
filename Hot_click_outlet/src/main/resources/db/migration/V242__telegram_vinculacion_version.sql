-- V242: bloqueo optimista en la vinculación de Telegram (canje de código vs revocación).
ALTER TABLE hot_click_telegram_vinculacion_tb ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;
