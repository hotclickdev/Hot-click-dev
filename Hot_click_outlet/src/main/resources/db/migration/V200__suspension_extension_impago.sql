-- ====================================================
-- Admin: suspensión manual por impago y "Dar 3 días extra" (26-oct-2026). Aditiva: tabla nueva, no toca filas
-- existentes ni borra datos. Una extensión por ciclo de impago (UNIQUE suscripcion_id = la mensualidad VENCIDA).
-- Durante la extensión la empresa queda en estado_empresa='EXTENSION_IMPAGO' (oculta, sin ventas nuevas);
-- al vencer vuelve a 'SUSPENDIDO_IMPAGO'. La bitácora (admin, motivo, hora) va en hot_click_auditoria_admin_tb.
CREATE TABLE IF NOT EXISTS hot_click_suspension_extension_tb (
    id_extension      BIGSERIAL    PRIMARY KEY,
    fk_id_empresa     BIGINT       NOT NULL REFERENCES hot_click_empresa_tb (id_empresa),
    suscripcion_id    BIGINT       NOT NULL,
    gracia_desde      TIMESTAMP    NOT NULL,
    gracia_hasta      TIMESTAMP    NOT NULL,
    otorgada_en       TIMESTAMP    NOT NULL,
    vence_en          TIMESTAMP    NOT NULL,
    admin_id          BIGINT       NULL,
    admin_email       VARCHAR(150) NULL,
    motivo            VARCHAR(500) NOT NULL,
    CONSTRAINT uq_suspension_extension_ciclo UNIQUE (suscripcion_id)
);
CREATE INDEX IF NOT EXISTS idx_suspension_extension_empresa ON hot_click_suspension_extension_tb (fk_id_empresa, vence_en);
