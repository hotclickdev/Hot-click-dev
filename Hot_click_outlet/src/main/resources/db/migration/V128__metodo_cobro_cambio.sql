-- V128: cambio de cuenta de cobro queda en revisión hasta admin.
-- El destino vigente no se pisa; la solicitud vive en hot_click_solicitud_aprobacion_tb.
ALTER TABLE hot_click_metodo_cobro_tb
    ADD COLUMN IF NOT EXISTS en_revision BOOLEAN NOT NULL DEFAULT FALSE;

-- Máscara de listado: nunca el número completo (SINPE era 8888-0000 = los 8 dígitos).
UPDATE hot_click_metodo_cobro_tb
SET mascara = '••••-' || RIGHT(destino, 4)
WHERE tipo = 'SINPE'
  AND destino IS NOT NULL
  AND length(destino) >= 4;

CREATE INDEX IF NOT EXISTS idx_solicitud_metodo_cobro_pendiente
    ON hot_click_solicitud_aprobacion_tb (tipo_entidad, estado_solicitud, fecha_solicitud DESC)
    WHERE tipo_entidad = 'METODO_COBRO';
