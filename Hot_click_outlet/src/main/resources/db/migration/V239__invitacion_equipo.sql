-- V239 (16-nov-2026): invitaciones de equipo pendientes. Invitar (cuenta existente o nueva) ya no agrega al miembro:
-- crea una invitación de un solo uso que la persona acepta con el enlace del correo. Solo se guarda el SHA-256 del
-- token. Aditiva e idempotente.
CREATE TABLE IF NOT EXISTS hot_click_invitacion_equipo_tb (
    id_invitacion      BIGSERIAL PRIMARY KEY,
    fk_id_empresa      BIGINT       NOT NULL REFERENCES hot_click_empresa_tb (id_empresa) ON DELETE CASCADE,
    correo             VARCHAR(150) NOT NULL,
    nombre             VARCHAR(150) NOT NULL,
    telefono           VARCHAR(30),
    rol_en_empresa     VARCHAR(30)  NOT NULL,
    token_hash         VARCHAR(64)  NOT NULL,
    vence_en           TIMESTAMP    NOT NULL,
    usado_en           TIMESTAMP,
    revocado_en        TIMESTAMP,
    fecha_creacion     TIMESTAMP    NOT NULL,
    fk_id_usuario_invita BIGINT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitacion_equipo_token_hash
    ON hot_click_invitacion_equipo_tb (token_hash);
-- Una sola invitación viva por correo y negocio.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitacion_equipo_pendiente
    ON hot_click_invitacion_equipo_tb (fk_id_empresa, correo)
    WHERE usado_en IS NULL AND revocado_en IS NULL;
