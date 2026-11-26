-- V259: AG-34 / AG-40 — registro de avisos del bot que deben salir UNA sola vez (comprobante por WhatsApp y los
-- 3 pasos de acompañamiento de un negocio nuevo). La llave (tipo, referencia_id) es la guarda de idempotencia:
-- no guarda contacto ni texto, solo el tipo de aviso y el id interno (comprobante o lead). Idempotente.
CREATE TABLE IF NOT EXISTS hot_click_agente_aviso_unico_tb (
    tipo          VARCHAR(30)  NOT NULL,
    referencia_id BIGINT       NOT NULL,
    creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tipo, referencia_id)
);
CREATE INDEX IF NOT EXISTS idx_agente_aviso_unico_creado ON hot_click_agente_aviso_unico_tb (creado_en);
