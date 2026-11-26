-- AG-20/AG-21: vinculación verificada de un teléfono de WhatsApp a un usuario del negocio (modo interno del bot),
-- PIN con hash y bitácora de las acciones ejecutadas por el bot. Idempotente.
CREATE TABLE IF NOT EXISTS hot_click_agente_vinculacion_tb (
    id_vinculacion        BIGSERIAL PRIMARY KEY,
    fk_id_usuario         BIGINT      NOT NULL REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE CASCADE,
    fk_id_empresa         BIGINT      NOT NULL REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    canal                 VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
    contacto_hash         VARCHAR(64),
    contacto_ultimos4     VARCHAR(4),
    estado                VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ACTIVA', 'REVOCADA')),
    codigo_hash           VARCHAR(64),
    codigo_expira         TIMESTAMPTZ,
    pin_hash              VARCHAR(100),
    pin_intentos_fallidos INT         NOT NULL DEFAULT 0,
    pin_bloqueado_hasta   TIMESTAMPTZ,
    pin_sesion_hasta      TIMESTAMPTZ,
    pendiente_tipo        VARCHAR(20),
    pendiente_json        TEXT,
    pendiente_expira      TIMESTAMPTZ,
    fecha_creacion        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_vinculacion     TIMESTAMPTZ,
    fecha_revocacion      TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agente_vinc_usuario_empresa_canal
    ON hot_click_agente_vinculacion_tb (fk_id_usuario, fk_id_empresa, canal);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agente_vinc_contacto_activa
    ON hot_click_agente_vinculacion_tb (fk_id_empresa, canal, contacto_hash) WHERE estado = 'ACTIVA';
CREATE INDEX IF NOT EXISTS idx_agente_vinc_codigo
    ON hot_click_agente_vinculacion_tb (fk_id_empresa, codigo_hash) WHERE codigo_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS hot_click_agente_accion_tb (
    id_accion      BIGSERIAL PRIMARY KEY,
    fk_id_empresa  BIGINT      NOT NULL,
    fk_id_usuario  BIGINT,
    canal          VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
    accion         VARCHAR(40) NOT NULL,
    resultado      VARCHAR(20) NOT NULL,
    entidad_id     BIGINT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agente_accion_empresa_fecha
    ON hot_click_agente_accion_tb (fk_id_empresa, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_agente_accion_fecha ON hot_click_agente_accion_tb (fecha_creacion);
