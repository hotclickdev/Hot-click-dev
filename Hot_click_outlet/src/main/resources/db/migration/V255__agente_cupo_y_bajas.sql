-- V255: AG-29 — cupo de conversaciones del bot por plan, tope de gasto de IA por negocio y lista de bajas (STOP).
-- Idempotente. Los valores de cupo son la RECOMENDACION pendiente de confirmar por el dueño (Emprendedor 100,
-- PyME 500, Negocio Plus 1500); se cambian con un UPDATE sobre hot_click_plan_tb, sin desplegar.
-- max_conversaciones_agente: -1 = ilimitado, 0 = sin cupo. El tope de gasto en USD va por propiedad (agente.tope-usd.*).

ALTER TABLE hot_click_plan_tb ADD COLUMN IF NOT EXISTS tiene_agente BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hot_click_plan_tb ADD COLUMN IF NOT EXISTS max_conversaciones_agente INTEGER NOT NULL DEFAULT 0;

UPDATE hot_click_plan_tb SET tiene_agente = TRUE, max_conversaciones_agente = 100
 WHERE nombre = 'EMPRENDEDOR' AND tiene_agente = FALSE AND max_conversaciones_agente = 0;
UPDATE hot_click_plan_tb SET tiene_agente = TRUE, max_conversaciones_agente = 500
 WHERE nombre = 'PYME' AND tiene_agente = FALSE AND max_conversaciones_agente = 0;
UPDATE hot_click_plan_tb SET tiene_agente = TRUE, max_conversaciones_agente = 1500
 WHERE nombre = 'NEGOCIO_PLUS' AND tiene_agente = FALSE AND max_conversaciones_agente = 0;

-- Marca "cupo agotado" en la conversacion que pasó a PERSONA porque el negocio llegó a su cupo o a su tope de gasto.
ALTER TABLE hot_click_chat_sesion_tb ADD COLUMN IF NOT EXISTS cupo_agotado BOOLEAN NOT NULL DEFAULT FALSE;

-- Uso del mes por negocio. fk_id_empresa NULL = HotClick; empresa_clave (0 = HotClick) hace única la fila por mes.
CREATE TABLE IF NOT EXISTS hot_click_agente_uso_mes_tb (
    id_uso          BIGSERIAL     PRIMARY KEY,
    fk_id_empresa   BIGINT        REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    empresa_clave   BIGINT        NOT NULL DEFAULT 0,
    mes             DATE          NOT NULL,
    conversaciones  INTEGER       NOT NULL DEFAULT 0,
    costo_usd       NUMERIC(12,6) NOT NULL DEFAULT 0,
    aviso_80_en     TIMESTAMPTZ,
    aviso_100_en    TIMESTAMPTZ,
    CONSTRAINT uq_agente_uso_mes UNIQUE (empresa_clave, mes)
);
CREATE INDEX IF NOT EXISTS idx_agente_uso_mes_empresa ON hot_click_agente_uso_mes_tb (fk_id_empresa);

-- Conversaciones ya contadas en el mes: un mismo cliente cuenta una sola vez. Solo el hash del contacto (HMAC), nunca el número.
CREATE TABLE IF NOT EXISTS hot_click_agente_conv_mes_tb (
    empresa_clave   BIGINT       NOT NULL DEFAULT 0,
    mes             DATE         NOT NULL,
    contacto_hash   VARCHAR(64)  NOT NULL,
    fk_id_empresa   BIGINT       REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (empresa_clave, mes, contacto_hash)
);
CREATE INDEX IF NOT EXISTS idx_agente_conv_mes_empresa ON hot_click_agente_conv_mes_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_agente_conv_mes_mes ON hot_click_agente_conv_mes_tb (mes);

-- Lista de bajas (STOP). Solo hash del contacto (empresa + canal + contacto), canal y fecha; sin el contacto en claro.
CREATE TABLE IF NOT EXISTS hot_click_agente_baja_tb (
    id_baja         BIGSERIAL    PRIMARY KEY,
    fk_id_empresa   BIGINT       REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    canal           VARCHAR(20)  NOT NULL,
    contacto_hash   VARCHAR(64)  NOT NULL,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_agente_baja_hash UNIQUE (contacto_hash)
);
CREATE INDEX IF NOT EXISTS idx_agente_baja_empresa ON hot_click_agente_baja_tb (fk_id_empresa);
