-- V57: Agrega campo calificacion (1-5 estrellas) a testimonios
ALTER TABLE hot_click_testimonio_tb
  ADD COLUMN IF NOT EXISTS calificacion INTEGER;

-- DROP + ADD para que sea idempotente (PostgreSQL no tiene ADD CONSTRAINT IF NOT EXISTS)
ALTER TABLE hot_click_testimonio_tb
  DROP CONSTRAINT IF EXISTS chk_testimonio_calificacion;

ALTER TABLE hot_click_testimonio_tb
  ADD CONSTRAINT chk_testimonio_calificacion CHECK (calificacion BETWEEN 1 AND 5);
