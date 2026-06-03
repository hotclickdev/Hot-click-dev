-- F24: Executive AI Dashboard — report cache table
CREATE TABLE IF NOT EXISTS hot_click_reporte_tb (
    id_reporte        BIGSERIAL     PRIMARY KEY,
    fk_id_empresa     BIGINT        NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    tipo              VARCHAR(50)   NOT NULL DEFAULT 'EJECUTIVO_MENSUAL',
    periodo           VARCHAR(10)   NOT NULL,
    estado            VARCHAR(20)   NOT NULL DEFAULT 'GENERADO',
    resumen_ai        TEXT,
    fecha_generacion  TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (fk_id_empresa, tipo, periodo)
);

CREATE INDEX IF NOT EXISTS idx_reporte_empresa ON hot_click_reporte_tb (fk_id_empresa, periodo DESC);
