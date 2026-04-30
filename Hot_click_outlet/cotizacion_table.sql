-- ============================================================
-- HOTCLICK — Tabla de Cotizaciones
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS hot_click_cotizacion_tb (
    id_cotizacion   BIGSERIAL PRIMARY KEY,
    nombre_cliente  VARCHAR(200),
    telefono        VARCHAR(20)  NOT NULL,
    productos       TEXT         NOT NULL,   -- JSON: [{id, nombre, cantidad, precio}]
    total           INTEGER      NOT NULL,
    mensaje_enviado TEXT,
    fecha_cotizacion TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    fk_id_estado    INTEGER      DEFAULT 1
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_cotizacion_estado  ON hot_click_cotizacion_tb (fk_id_estado);
CREATE INDEX IF NOT EXISTS idx_cotizacion_fecha   ON hot_click_cotizacion_tb (fecha_cotizacion DESC);
CREATE INDEX IF NOT EXISTS idx_cotizacion_telefono ON hot_click_cotizacion_tb (telefono);
