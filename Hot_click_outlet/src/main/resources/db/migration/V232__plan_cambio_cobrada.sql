-- V232 (04-nov-2026) Cambio de plan con suscripción ONVO ya cobrada. Aditiva: una columna nueva y una tabla nueva.
-- 1) onvo_sub_reemplazada: id de la suscripción ONVO vieja que se reemplazó al subir a Negocio Plus. Un pago que llegue
--    después para ese id se ignora (nunca activa ni cambia el plan). NULL = no hubo reemplazo por subida.
ALTER TABLE hot_click_suscripcion_tb ADD COLUMN onvo_sub_reemplazada VARCHAR(100);
CREATE INDEX IF NOT EXISTS ix_suscripcion_onvo_sub_reemplazada ON hot_click_suscripcion_tb (onvo_sub_reemplazada);
CREATE INDEX IF NOT EXISTS ix_suscripcion_onvo_sub_por_cancelar ON hot_click_suscripcion_tb (onvo_sub_por_cancelar);
-- 2) Solicitudes de bajar de plan: la pyme no baja sola; ADMIN las revisa.
CREATE TABLE IF NOT EXISTS hot_click_solicitud_cambio_plan_tb (
    id               BIGSERIAL    PRIMARY KEY,
    empresa_id       BIGINT       NOT NULL,
    plan_actual      VARCHAR(40)  NOT NULL,
    plan_solicitado  VARCHAR(40)  NOT NULL,
    motivo           VARCHAR(500) NOT NULL,
    fecha_solicitud  TIMESTAMP    NOT NULL,
    solicitado_por   BIGINT,
    revisada         BOOLEAN      NOT NULL DEFAULT FALSE,
    revisada_por     BIGINT,
    fecha_revision   TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_solicitud_cambio_plan_empresa ON hot_click_solicitud_cambio_plan_tb (empresa_id, revisada);
