-- V260: AG-36 (campañas de WhatsApp a clientes con consentimiento) y AG-37 (catálogo sincronizado con Meta).
-- Idempotente y solo aditiva. Datos personales: el contacto se guarda como hash HMAC (llave), últimos 4 dígitos y
-- valor cifrado (AES-GCM); al revocar el consentimiento se borra el cifrado y el nombre y queda solo la prueba.

-- Consentimiento explícito para campañas, por contacto y negocio. Evidencia: id del mensaje del botón o del pedido.
CREATE TABLE IF NOT EXISTS hot_click_agente_consentimiento_tb (
    id_consentimiento BIGSERIAL    PRIMARY KEY,
    fk_id_empresa     BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    canal             VARCHAR(20)  NOT NULL,
    contacto_hash     VARCHAR(64)  NOT NULL,
    contacto_ultimos4 VARCHAR(4),
    contacto_cifrado  TEXT,
    nombre            VARCHAR(120),
    estado            VARCHAR(10)  NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'REVOCADO')),
    origen            VARCHAR(20)  NOT NULL CHECK (origen IN ('BOTON_BOT', 'CHECKOUT')),
    evidencia         VARCHAR(300) NOT NULL,
    version_texto     VARCHAR(20)  NOT NULL,
    consentido_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    revocado_en       TIMESTAMPTZ,
    CONSTRAINT uq_agente_consentimiento_hash UNIQUE (contacto_hash)
);
CREATE INDEX IF NOT EXISTS idx_agente_consentimiento_empresa ON hot_click_agente_consentimiento_tb (fk_id_empresa, estado);

-- Plantillas de categoría MARKETING que define el negocio y que Meta aprueba o rechaza.
CREATE TABLE IF NOT EXISTS hot_click_agente_plantilla_mkt_tb (
    id_plantilla      BIGSERIAL    PRIMARY KEY,
    fk_id_empresa     BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    nombre            VARCHAR(100) NOT NULL,
    idioma            VARCHAR(10)  NOT NULL DEFAULT 'es',
    cuerpo            VARCHAR(1024) NOT NULL,
    ejemplos          TEXT,
    estado            VARCHAR(12)  NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    meta_plantilla_id VARCHAR(64),
    motivo_rechazo    VARCHAR(200),
    creado_en         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_agente_plantilla_mkt UNIQUE (fk_id_empresa, nombre, idioma)
);
CREATE INDEX IF NOT EXISTS idx_agente_plantilla_mkt_meta ON hot_click_agente_plantilla_mkt_tb (meta_plantilla_id);

CREATE TABLE IF NOT EXISTS hot_click_agente_campana_tb (
    id_campana            BIGSERIAL     PRIMARY KEY,
    fk_id_empresa         BIGINT        NOT NULL REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    fk_id_plantilla       BIGINT        NOT NULL REFERENCES hot_click_agente_plantilla_mkt_tb(id_plantilla),
    nombre                VARCHAR(120)  NOT NULL,
    segmento              VARCHAR(30)   NOT NULL CHECK (segmento IN ('TODOS', 'COMPRADORES_RECIENTES', 'INTERES_CATEGORIA', 'LEADS')),
    segmento_dias         INTEGER,
    segmento_categoria_id BIGINT,
    parametros            TEXT,
    estado                VARCHAR(12)   NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'EN_CURSO', 'COMPLETADA', 'CANCELADA')),
    programada_para       TIMESTAMPTZ,
    destinatarios         INTEGER       NOT NULL DEFAULT 0,
    costo_estimado_usd    NUMERIC(12,4) NOT NULL DEFAULT 0,
    lanzada_en            TIMESTAMPTZ,
    finalizada_en         TIMESTAMPTZ,
    fk_id_usuario         BIGINT,
    creado_en             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agente_campana_empresa ON hot_click_agente_campana_tb (fk_id_empresa, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_agente_campana_estado ON hot_click_agente_campana_tb (estado);

-- Un envío por contacto y campaña; solo el hash del contacto. Los contadores del panel salen de aquí.
CREATE TABLE IF NOT EXISTS hot_click_agente_campana_envio_tb (
    id_envio        BIGSERIAL    PRIMARY KEY,
    fk_id_campana   BIGINT       NOT NULL REFERENCES hot_click_agente_campana_tb(id_campana) ON DELETE CASCADE,
    fk_id_empresa   BIGINT       NOT NULL,
    contacto_hash   VARCHAR(64)  NOT NULL,
    estado          VARCHAR(12)  NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ENVIADO', 'ENTREGADO', 'LEIDO', 'FALLIDO', 'OMITIDO')),
    motivo          VARCHAR(40),
    intentos        INTEGER      NOT NULL DEFAULT 0,
    meta_mensaje_id VARCHAR(120),
    enviado_en      TIMESTAMPTZ,
    entregado_en    TIMESTAMPTZ,
    leido_en        TIMESTAMPTZ,
    respondido_en   TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_agente_campana_envio UNIQUE (fk_id_campana, contacto_hash)
);
CREATE INDEX IF NOT EXISTS idx_agente_envio_pendiente ON hot_click_agente_campana_envio_tb (fk_id_campana, estado);
CREATE INDEX IF NOT EXISTS idx_agente_envio_mensaje ON hot_click_agente_campana_envio_tb (meta_mensaje_id);
CREATE INDEX IF NOT EXISTS idx_agente_envio_contacto ON hot_click_agente_campana_envio_tb (fk_id_empresa, contacto_hash, enviado_en);

-- Catálogo de Meta conectado por negocio (uno por negocio) y los productos ya sincronizados.
CREATE TABLE IF NOT EXISTS hot_click_agente_catalogo_tb (
    fk_id_empresa  BIGINT      PRIMARY KEY REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    catalogo_id    VARCHAR(64) NOT NULL,
    estado         VARCHAR(10) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'PAUSADO')),
    ultima_sync_en TIMESTAMPTZ,
    ultimo_error   VARCHAR(60),
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hot_click_agente_catalogo_item_tb (
    fk_id_empresa    BIGINT      NOT NULL REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    fk_id_producto   BIGINT      NOT NULL,
    meta_producto_id VARCHAR(64),
    huella           VARCHAR(64) NOT NULL,
    estado           VARCHAR(12) NOT NULL DEFAULT 'SINCRONIZADO' CHECK (estado IN ('SINCRONIZADO', 'ELIMINADO')),
    sincronizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (fk_id_empresa, fk_id_producto)
);
