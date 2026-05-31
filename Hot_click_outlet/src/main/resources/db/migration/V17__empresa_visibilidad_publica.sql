-- V17: campo visibilidad_publica en empresa
-- Permite al emprendedor pausar/activar su tienda sin perder el estado de aprobación
ALTER TABLE hot_click_empresa_tb
    ADD COLUMN IF NOT EXISTS visibilidad_publica BOOLEAN NOT NULL DEFAULT TRUE;
