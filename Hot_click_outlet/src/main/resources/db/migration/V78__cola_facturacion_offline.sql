-- V78: Cola de contingencia para facturación electrónica Hacienda CR
--
-- FacturacionService.consultarPendientesHacienda() (cron "facturacion_polling")
-- ya reintenta PENDIENTE/ENVIADO cada 5 min, pero un comprobante que cae en
-- ESTADO_ERROR tras agotar sus 5 intentos rápidos queda huérfano: nada lo
-- vuelve a tomar. Esta tabla es el "dead letter queue" para esos comprobantes:
-- los recibe explícitamente (ver FacturacionContingenciaService.encolar) y los
-- reintenta con backoff más lento hasta que Hacienda se restablezca, sin pelear
-- por las mismas filas con el polling normal.

CREATE TABLE IF NOT EXISTS hot_click_cola_facturacion_offline_tb (
    id_cola_offline       BIGSERIAL     PRIMARY KEY,
    fk_id_empresa         BIGINT        NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_comprobante     BIGINT        NOT NULL UNIQUE REFERENCES hot_click_comprobante_fiscal_tb(id_comprobante),
    estado                VARCHAR(20)   NOT NULL DEFAULT 'PENDIENTE',
    -- PENDIENTE → PROCESANDO → COMPLETADO | AGOTADO
    intentos              INTEGER       NOT NULL DEFAULT 0,
    max_intentos          INTEGER       NOT NULL DEFAULT 12,
    ultimo_error          TEXT,
    fecha_creacion        TIMESTAMP     NOT NULL DEFAULT NOW(),
    fecha_proximo_intento TIMESTAMP     NOT NULL DEFAULT NOW(),
    fecha_inicio_proceso  TIMESTAMP,
    fecha_completado      TIMESTAMP
);

-- Índice parcial: el scheduler solo lee filas PENDIENTE listas para reintentar;
-- la mayoría de filas terminan en COMPLETADO/AGOTADO y no deben pesar en ese índice.
CREATE INDEX IF NOT EXISTS idx_cola_offline_pendientes
    ON hot_click_cola_facturacion_offline_tb (fecha_proximo_intento)
    WHERE estado = 'PENDIENTE';

CREATE INDEX IF NOT EXISTS idx_cola_offline_empresa
    ON hot_click_cola_facturacion_offline_tb (fk_id_empresa);
