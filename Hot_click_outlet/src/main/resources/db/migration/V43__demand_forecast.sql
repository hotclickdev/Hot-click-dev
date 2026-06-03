-- F23: AI Demand Forecasting (Holt-Winters)
CREATE TABLE IF NOT EXISTS hot_click_forecast_tb (
    id_forecast       BIGSERIAL     PRIMARY KEY,
    fk_id_empresa     BIGINT        NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_producto    BIGINT        REFERENCES hot_click_producto_tb(id_producto),
    periodo           VARCHAR(10)   NOT NULL,
    tipo              VARCHAR(10)   NOT NULL DEFAULT 'SEMANAL',
    unidades_forecast INTEGER       NOT NULL DEFAULT 0,
    ingresos_forecast INTEGER       NOT NULL DEFAULT 0,
    confianza         NUMERIC(5,2)  DEFAULT 0,
    fecha_generacion  TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (fk_id_empresa, fk_id_producto, periodo, tipo)
);

CREATE INDEX IF NOT EXISTS idx_forecast_empresa ON hot_click_forecast_tb (fk_id_empresa, periodo);
