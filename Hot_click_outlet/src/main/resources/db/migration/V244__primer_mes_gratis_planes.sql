-- V244 (26-nov-2026): primer mes gratis de los planes PYME y NEGOCIO_PLUS. Aditiva e idempotente.
-- Marca la vez en que el negocio recibio el periodo gratis de un plan de pago (una sola vez por negocio, para siempre).
-- Nunca la limpian liberarPuesto, QA ni la aprobacion: es el historial que impide regalarlo otra vez.
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS primer_mes_gratis_usado_en TIMESTAMP NULL;
