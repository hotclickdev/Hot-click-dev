-- V85: Estado de inscripción en Hacienda CR por empresa
-- Permite verificar contribuyentes vía API pública de Hacienda (fe/ae)
-- y guardar el régimen tributario para factura electrónica futura

ALTER TABLE hot_click_empresa_tb
    ADD COLUMN IF NOT EXISTS inscrito_hacienda   BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS regimen_tributario  VARCHAR(60),
    ADD COLUMN IF NOT EXISTS nombre_hacienda     VARCHAR(200),
    ADD COLUMN IF NOT EXISTS fecha_verificacion_hacienda TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_empresa_inscrito_hacienda
    ON hot_click_empresa_tb(inscrito_hacienda);
