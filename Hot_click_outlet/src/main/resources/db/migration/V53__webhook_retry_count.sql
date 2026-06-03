-- V53: Agrega contador de reintentos a webhooks para evitar loops infinitos.
-- WebhookRetryScheduler deja de reintentar cuando intentos_reintento >= 5.
-- El campo error_procesamiento sigue guardando el último error para diagnóstico.

ALTER TABLE hot_click_webhook_event_tb
    ADD COLUMN IF NOT EXISTS intentos_reintento INTEGER NOT NULL DEFAULT 0;

-- Índice para que findPendientesParaReintento solo toque filas elegibles
CREATE INDEX IF NOT EXISTS idx_webhook_pendientes_reintento
    ON hot_click_webhook_event_tb (procesado, fecha_recepcion)
    WHERE procesado = false;
