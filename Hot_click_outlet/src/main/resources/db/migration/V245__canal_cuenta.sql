-- AG-03: cuentas de mensajería conectadas (WhatsApp, Instagram, Messenger).
-- fk_id_empresa NULL = cuenta de HotClick (bot de la plataforma). El id externo de Meta
-- (phone_number_id / id de página / id de Instagram) es único por tipo. El token va cifrado
-- (AES-GCM, ENC:...) y nunca se devuelve por la API ni se escribe en logs. Aditiva: tabla nueva.
CREATE TABLE IF NOT EXISTS hot_click_canal_cuenta_tb (
    id_canal_cuenta     BIGSERIAL    PRIMARY KEY,
    tipo                VARCHAR(20)  NOT NULL,
    fk_id_empresa       BIGINT       REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    id_externo          VARCHAR(100) NOT NULL,
    waba_id             VARCHAR(100),
    nombre              VARCHAR(150),
    token_cifrado       TEXT,
    estado              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVA',
    fecha_creacion      TIMESTAMP    NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_canal_cuenta_tipo   CHECK (tipo IN ('WHATSAPP', 'INSTAGRAM', 'MESSENGER')),
    CONSTRAINT chk_canal_cuenta_estado CHECK (estado IN ('ACTIVA', 'PAUSADA', 'DESCONECTADA'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_canal_cuenta_tipo_externo ON hot_click_canal_cuenta_tb (tipo, id_externo);
CREATE INDEX IF NOT EXISTS idx_canal_cuenta_empresa ON hot_click_canal_cuenta_tb (fk_id_empresa);
