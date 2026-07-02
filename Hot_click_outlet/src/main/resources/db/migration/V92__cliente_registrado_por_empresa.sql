-- V92: permite que un emprendedor registre manualmente un cliente (contacto)
-- sin que exista todavía un pedido que lo vincule a la empresa.

ALTER TABLE hot_click_usuario_tb
    ADD COLUMN IF NOT EXISTS fk_id_empresa_registro BIGINT NULL
    REFERENCES hot_click_empresa_tb(id_empresa);

CREATE INDEX IF NOT EXISTS idx_usuario_empresa_registro
    ON hot_click_usuario_tb (fk_id_empresa_registro);
