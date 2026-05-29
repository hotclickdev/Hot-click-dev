-- V10: Approval workflow + Soft Delete

CREATE TABLE IF NOT EXISTS hot_click_solicitud_aprobacion_tb (
    id_solicitud           BIGSERIAL    PRIMARY KEY,
    tipo_entidad           VARCHAR(50)  NOT NULL,
    accion_solicitada      VARCHAR(20)  NOT NULL,
    id_entidad             BIGINT       NOT NULL,
    datos_snapshot         JSONB,
    motivo_solicitud       TEXT,
    estado_solicitud       VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    comentario_revisor     TEXT,
    fecha_solicitud        TIMESTAMP    NOT NULL DEFAULT NOW(),
    fecha_resolucion       TIMESTAMP,
    fk_id_empresa          BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_usuario_pide     BIGINT       NOT NULL REFERENCES hot_click_usuario_tb(id_usuario),
    fk_id_usuario_resuelve BIGINT       REFERENCES hot_click_usuario_tb(id_usuario),
    fk_id_estado           INTEGER      NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_solicitud_empresa_estado
    ON hot_click_solicitud_aprobacion_tb (fk_id_empresa, estado_solicitud);
CREATE INDEX IF NOT EXISTS idx_solicitud_tipo_entidad
    ON hot_click_solicitud_aprobacion_tb (tipo_entidad, id_entidad);
CREATE INDEX IF NOT EXISTS idx_solicitud_global_pendiente
    ON hot_click_solicitud_aprobacion_tb (estado_solicitud)
    WHERE estado_solicitud = 'PENDIENTE';

-- Soft Delete
ALTER TABLE "HOT_CLICK_PRODUCTO_TB" ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE hot_click_marca_tb      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE "HOT_CLICK_CATEGORIA_TB" ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE "HOT_CLICK_BODEGA_TB"   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE hot_click_usuario_tb    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_producto_not_deleted
    ON "HOT_CLICK_PRODUCTO_TB" (fk_id_empresa, "FK_ID_ESTADO") WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_marca_not_deleted
    ON hot_click_marca_tb (fk_id_empresa) WHERE deleted_at IS NULL;
