-- Atribución de pedidos (first/last touch) + gasto diario de ads + insights Meta

CREATE TABLE IF NOT EXISTS hot_click_atribucion_pedido_tb (
    id_atribucion       BIGSERIAL PRIMARY KEY,
    fk_id_pedido        BIGINT NOT NULL UNIQUE
        REFERENCES hot_click_pedido_tb(id_pedido) ON DELETE CASCADE,
    fk_id_empresa       BIGINT
        REFERENCES hot_click_empresa_tb(id_empresa),
    -- Primer toque
    first_utm_source    VARCHAR(120),
    first_utm_medium    VARCHAR(120),
    first_utm_campaign  VARCHAR(255),
    first_utm_content   VARCHAR(255),
    first_utm_term      VARCHAR(255),
    first_fbclid        VARCHAR(255),
    first_gclid         VARCHAR(255),
    first_landing_path  VARCHAR(500),
    first_touched_at    TIMESTAMP,
    -- Último toque no directo
    last_utm_source     VARCHAR(120),
    last_utm_medium     VARCHAR(120),
    last_utm_campaign   VARCHAR(255),
    last_utm_content    VARCHAR(255),
    last_utm_term       VARCHAR(255),
    last_fbclid         VARCHAR(255),
    last_gclid          VARCHAR(255),
    last_landing_path   VARCHAR(500),
    last_touched_at     TIMESTAMP,
    -- Dedup Meta pixel / CAPI
    event_id_purchase   VARCHAR(100),
    fbp                 VARCHAR(255),
    fbc                 VARCHAR(255),
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atribucion_empresa
    ON hot_click_atribucion_pedido_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_atribucion_last_campaign
    ON hot_click_atribucion_pedido_tb (last_utm_campaign);
CREATE INDEX IF NOT EXISTS idx_atribucion_first_campaign
    ON hot_click_atribucion_pedido_tb (first_utm_campaign);
CREATE INDEX IF NOT EXISTS idx_atribucion_last_touched
    ON hot_click_atribucion_pedido_tb (last_touched_at);

-- Gasto manual (o sync) por campaña y día — base de ROAS/CAC
CREATE TABLE IF NOT EXISTS hot_click_ads_gasto_diario_tb (
    id_gasto_ads        BIGSERIAL PRIMARY KEY,
    fk_id_empresa       BIGINT
        REFERENCES hot_click_empresa_tb(id_empresa),
    fecha               DATE NOT NULL,
    canal               VARCHAR(40) NOT NULL DEFAULT 'meta',
    campana             VARCHAR(255) NOT NULL,
    monto_crc           INTEGER NOT NULL DEFAULT 0,
    notas               TEXT,
    fuente              VARCHAR(40) NOT NULL DEFAULT 'manual',
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ads_gasto_empresa_fecha_canal_campana
        UNIQUE (fk_id_empresa, fecha, canal, campana)
);

CREATE INDEX IF NOT EXISTS idx_ads_gasto_fecha
    ON hot_click_ads_gasto_diario_tb (fecha);
CREATE INDEX IF NOT EXISTS idx_ads_gasto_empresa_fecha
    ON hot_click_ads_gasto_diario_tb (fk_id_empresa, fecha);

-- Insights diarios (Meta Marketing API o carga manual) — CPM/CPC/frecuencia
CREATE TABLE IF NOT EXISTS hot_click_ads_insight_diario_tb (
    id_insight          BIGSERIAL PRIMARY KEY,
    fk_id_empresa       BIGINT
        REFERENCES hot_click_empresa_tb(id_empresa),
    fecha               DATE NOT NULL,
    canal               VARCHAR(40) NOT NULL DEFAULT 'meta',
    campana             VARCHAR(255) NOT NULL,
    anuncio_id          VARCHAR(80),
    anuncio_nombre      VARCHAR(255),
    gasto_crc           INTEGER NOT NULL DEFAULT 0,
    impresiones         BIGINT NOT NULL DEFAULT 0,
    clics               BIGINT NOT NULL DEFAULT 0,
    frecuencia          NUMERIC(8, 4),
    ctr                 NUMERIC(8, 6),
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ads_insight_dia
        UNIQUE (fk_id_empresa, fecha, canal, campana, anuncio_id)
);

CREATE INDEX IF NOT EXISTS idx_ads_insight_fecha
    ON hot_click_ads_insight_diario_tb (fecha);
CREATE INDEX IF NOT EXISTS idx_ads_insight_empresa_fecha
    ON hot_click_ads_insight_diario_tb (fk_id_empresa, fecha);
