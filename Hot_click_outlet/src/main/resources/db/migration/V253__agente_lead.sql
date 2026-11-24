-- V253: AG-27 — leads del bot sin cuenta (comprador interesado en un negocio, o negocio interesado en vender en HotClick).
-- fk_id_empresa NULL = lead de HotClick (lo ve el ADMIN); con valor = lead del negocio (lo ve solo ese negocio).
-- El contacto NO se guarda en claro: hash SHA-256 (deduplicación), últimos 4 dígitos (para mostrar) y el valor
-- cifrado con AES-GCM (el CRM lo descifra solo en el detalle, para poder responder al lead). Retención en
-- DataRetentionScheduler: 6 meses compradores, 12 meses negocios. Idempotente.

CREATE TABLE IF NOT EXISTS hot_click_lead_tb (
    id_lead            BIGSERIAL    PRIMARY KEY,
    tipo               VARCHAR(12)  NOT NULL CHECK (tipo IN ('COMPRADOR', 'NEGOCIO')),
    fk_id_empresa      BIGINT       REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    canal              VARCHAR(20),
    contacto_hash      VARCHAR(64)  NOT NULL,
    contacto_ultimos4  VARCHAR(4),
    contacto_cifrado   TEXT,
    nombre             VARCHAR(120),
    tipo_negocio       VARCHAR(120),
    interes            VARCHAR(500),
    estado             VARCHAR(12)  NOT NULL DEFAULT 'NUEVO'
                       CHECK (estado IN ('NUEVO', 'CONTACTADO', 'CONVERTIDO', 'DESCARTADO')),
    fk_id_chat_sesion  UUID         REFERENCES hot_click_chat_sesion_tb(id_sesion) ON DELETE SET NULL,
    creado_en          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_empresa_creado
    ON hot_click_lead_tb (fk_id_empresa, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_lead_tipo_creado
    ON hot_click_lead_tb (tipo, creado_en);
CREATE INDEX IF NOT EXISTS idx_lead_contacto_hash
    ON hot_click_lead_tb (contacto_hash, tipo);
