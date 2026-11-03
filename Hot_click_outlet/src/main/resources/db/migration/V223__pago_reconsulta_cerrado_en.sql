-- V223 (03-nov-2026) BAJO QA7-B1 (b): marca de la última reconsulta en ONVO de un pago cerrado (FALLIDO/CANCELADO).
-- El respaldo ordenaba por fecha_creacion DESC con un lote y los más viejos de la ventana podían no revisarse nunca;
-- ahora rota por esta marca (NULL primero). Aditiva: una columna nullable, sin backfill ni cambios de datos.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reconsulta_cerrado_en TIMESTAMP;
