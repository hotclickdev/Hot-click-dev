-- V99: tickets de soporte — un EMPRENDEDOR reporta un problema a HotClick
-- (foto + título + descripción). Se notifica por correo al equipo; sin panel
-- de gestión todavía (se revisan por correo/BD).

CREATE TABLE IF NOT EXISTS hot_click_ticket_soporte_tb (
    id_ticket_soporte BIGSERIAL PRIMARY KEY,
    fk_id_empresa     BIGINT NOT NULL REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    fk_id_usuario     BIGINT REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE SET NULL,
    titulo            VARCHAR(150) NOT NULL,
    descripcion       TEXT NOT NULL,
    foto_url          VARCHAR(500),
    estado            VARCHAR(20) NOT NULL DEFAULT 'ABIERTO',
    fecha_creacion    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_soporte_empresa ON hot_click_ticket_soporte_tb(fk_id_empresa);
