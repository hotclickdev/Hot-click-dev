-- V57: Agrega campo calificacion (1-5 estrellas) a testimonios
ALTER TABLE hot_click_testimonio_tb
  ADD COLUMN IF NOT EXISTS calificacion INTEGER,
  ADD CONSTRAINT IF NOT EXISTS chk_testimonio_calificacion CHECK (calificacion BETWEEN 1 AND 5);
