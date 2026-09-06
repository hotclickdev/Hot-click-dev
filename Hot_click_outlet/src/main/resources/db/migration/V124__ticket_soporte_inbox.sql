-- V124: inbox de soporte — asignar / resolver tickets desde admin
-- (V99 ya creó hot_click_ticket_soporte_tb; no recrear la tabla)
ALTER TABLE hot_click_ticket_soporte_tb
    ADD COLUMN IF NOT EXISTS fk_id_asignado BIGINT REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE SET NULL;

ALTER TABLE hot_click_ticket_soporte_tb
    ADD COLUMN IF NOT EXISTS fecha_asignacion TIMESTAMP;

ALTER TABLE hot_click_ticket_soporte_tb
    ADD COLUMN IF NOT EXISTS fecha_resolucion TIMESTAMP;

ALTER TABLE hot_click_ticket_soporte_tb
    ADD COLUMN IF NOT EXISTS notas_admin TEXT;

CREATE INDEX IF NOT EXISTS idx_ticket_soporte_estado
    ON hot_click_ticket_soporte_tb(estado);

CREATE INDEX IF NOT EXISTS idx_ticket_soporte_asignado
    ON hot_click_ticket_soporte_tb(fk_id_asignado);
