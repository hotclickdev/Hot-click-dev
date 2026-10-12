-- Visitas agregadas por categoría raíz y día (nav "categorías top" del header).
-- Sin PII: ni IP, ni usuario, ni cookie; solo un contador por (categoría, día).
-- El frontend solo lo incrementa con consentimiento de análisis.
CREATE TABLE IF NOT EXISTS hot_click_categoria_visita_dia_tb (
    id_visita        BIGSERIAL PRIMARY KEY,
    fk_id_categoria  BIGINT  NOT NULL REFERENCES hot_click_categoria_tb (id_categoria) ON DELETE CASCADE,
    dia              DATE    NOT NULL,
    visitas          INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_categoria_visita_dia UNIQUE (fk_id_categoria, dia)
);

CREATE INDEX IF NOT EXISTS idx_categoria_visita_dia_dia ON hot_click_categoria_visita_dia_tb (dia);
