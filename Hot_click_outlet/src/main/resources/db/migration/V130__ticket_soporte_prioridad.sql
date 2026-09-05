-- V130: prioridad automática en tickets de soporte, según el plan de la empresa

ALTER TABLE hot_click_ticket_soporte_tb
  ADD COLUMN IF NOT EXISTS prioridad VARCHAR(10) NOT NULL DEFAULT 'MEDIA';

CREATE INDEX IF NOT EXISTS idx_ticket_soporte_prioridad ON hot_click_ticket_soporte_tb (prioridad);
