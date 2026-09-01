-- V111: fulfillment post-pago y auditoría de transiciones

ALTER TABLE hot_click_encargo_tb
    ADD COLUMN IF NOT EXISTS estado_fulfillment VARCHAR(20);

CREATE TABLE IF NOT EXISTS hot_click_encargo_evento_tb (
    id_evento       BIGSERIAL PRIMARY KEY,
    fk_id_encargo   BIGINT NOT NULL REFERENCES hot_click_encargo_tb(id_encargo) ON DELETE CASCADE,
    tipo_evento     VARCHAR(40) NOT NULL,
    estado_anterior VARCHAR(20),
    estado_nuevo    VARCHAR(20),
    detalle         TEXT,
    fecha_evento    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encargo_evento_encargo
    ON hot_click_encargo_evento_tb (fk_id_encargo, fecha_evento DESC);
