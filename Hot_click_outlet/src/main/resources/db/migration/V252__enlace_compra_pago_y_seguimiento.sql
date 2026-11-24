-- AG-08 / AG-12: pago del enlace de compra y seguimiento (recordatorios).
-- Aditiva e idempotente: solo columnas nuevas con valor por defecto; no toca datos existentes.
--   rechazos_pago            cuantos pagos rechazados lleva el enlace (al segundo pasa a persona).
--   aviso_pendiente          aviso de pago (PAGADO/RECHAZADO) que no salio por estar el cliente fuera de las 24 h.
--   recordatorio_checkout_en cuando salio el recordatorio 2 (enlace abierto sin pagar); evita repetirlo.
ALTER TABLE hot_click_enlace_compra_tb ADD COLUMN IF NOT EXISTS rechazos_pago INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hot_click_enlace_compra_tb ADD COLUMN IF NOT EXISTS aviso_pendiente VARCHAR(20);
ALTER TABLE hot_click_enlace_compra_tb ADD COLUMN IF NOT EXISTS recordatorio_checkout_en TIMESTAMP;
