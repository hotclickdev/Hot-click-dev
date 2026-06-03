-- V32: F11 Feature Flags — overrides de features por empresa independientes del plan

-- ============================================================
-- Registro global de feature flags disponibles
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_feature_flag_tb (
    id_flag        BIGSERIAL    PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL UNIQUE,
    descripcion    TEXT,
    activo_defecto BOOLEAN      NOT NULL DEFAULT FALSE
);

-- ============================================================
-- Override por empresa: activa/desactiva un flag individualmente
-- fecha_exp NULL = sin expiración; con valor = A/B test con fecha límite
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_empresa_feature_tb (
    fk_id_empresa BIGINT      NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_flag    BIGINT      NOT NULL REFERENCES hot_click_feature_flag_tb(id_flag),
    activo        BOOLEAN     NOT NULL DEFAULT TRUE,
    fecha_exp     TIMESTAMP,
    PRIMARY KEY (fk_id_empresa, fk_id_flag)
);

CREATE INDEX IF NOT EXISTS idx_empresa_feature_empresa ON hot_click_empresa_feature_tb (fk_id_empresa);

-- ============================================================
-- Flags disponibles (seed)
-- ============================================================
INSERT INTO hot_click_feature_flag_tb (nombre, descripcion, activo_defecto) VALUES
    ('facturacion_electronica', 'Integración Hacienda CR — XML 4.3 + firma digital',   false),
    ('ai_copilot',              'Asistente AI de negocio (Claude API)',                  false),
    ('ai_forecast',             'Predicción de demanda y stock (Holt-Winters)',          false),
    ('mobile_pos',              'Modo POS optimizado para tablet/móvil (PWA offline)',   false),
    ('self_checkout',           'Terminal de autoservicio con QR',                       false),
    ('split_payments',          'Pagos divididos y gift cards',                          false),
    ('marketplace_plugins',     'Marketplace de plugins de terceros',                    false),
    ('api_keys',                'API keys externas y webhooks',                          false),
    ('white_label',             'Branding personalizado por empresa',                    false)
ON CONFLICT (nombre) DO NOTHING;
