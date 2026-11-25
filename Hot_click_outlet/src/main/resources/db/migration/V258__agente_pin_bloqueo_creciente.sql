-- V258: AG-14 H-05 — bloqueo creciente del PIN interno (15 min, 1 h, 24 h). Idempotente y aditiva.
ALTER TABLE hot_click_agente_vinculacion_tb ADD COLUMN IF NOT EXISTS pin_bloqueos_seguidos INTEGER NOT NULL DEFAULT 0;
