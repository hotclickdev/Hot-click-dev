-- V60: Control de uso en cupones — max_usos + usos_actuales
-- Permite bloquear automáticamente cuando se alcanza el límite configurado.

ALTER TABLE hot_click_cupon_tb
  ADD COLUMN IF NOT EXISTS max_usos      INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS usos_actuales INTEGER NOT NULL DEFAULT 0;

-- Backfill: cupones ya marcados como usado tienen usos_actuales = max_usos
UPDATE hot_click_cupon_tb
SET usos_actuales = max_usos
WHERE usado = true;

-- Restricción: usos_actuales no puede exceder max_usos
ALTER TABLE hot_click_cupon_tb
  ADD CONSTRAINT chk_cupon_usos CHECK (usos_actuales <= max_usos);
