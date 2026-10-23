-- Cuenta conectada ONVO (marketplace) por empresa. Aditiva: tabla nueva, no toca tablas existentes.
-- estado: PENDIENTE_ONVO (sin cuenta creada todavía, se reintenta), PENDIENTE_ONBOARDING, EN_APROBACION,
-- ACTIVA, INACTIVA, SUSPENDIDA. Solo ACTIVA habilita onBehalfOf en cobros.
CREATE TABLE IF NOT EXISTS hot_click_empresa_cuenta_onvo_tb (
    id_cuenta_onvo        BIGSERIAL PRIMARY KEY,
    fk_id_empresa         BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    onvo_account_id       VARCHAR(100),
    onvo_status           VARCHAR(40),
    estado                VARCHAR(30)  NOT NULL DEFAULT 'PENDIENTE_ONVO',
    onboarding_url        VARCHAR(1000),
    onboarding_expira_en  TIMESTAMP,
    intentos              INTEGER      NOT NULL DEFAULT 0,
    ultimo_error          VARCHAR(300),
    ultima_consulta_en    TIMESTAMP,
    creado_en             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_empresa_cuenta_onvo_empresa ON hot_click_empresa_cuenta_onvo_tb (fk_id_empresa);
CREATE UNIQUE INDEX IF NOT EXISTS uq_empresa_cuenta_onvo_account ON hot_click_empresa_cuenta_onvo_tb (onvo_account_id);
CREATE INDEX IF NOT EXISTS ix_empresa_cuenta_onvo_estado ON hot_click_empresa_cuenta_onvo_tb (estado);
