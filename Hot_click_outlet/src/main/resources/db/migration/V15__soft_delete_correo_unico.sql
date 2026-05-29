-- V15: Soft delete — permitir reusar correo/identificacion de usuarios eliminados
-- Reemplaza UNIQUE absoluto por índice parcial que excluye usuarios eliminados.

-- Eliminar constraints UNIQUE absolutos en correo
ALTER TABLE hot_click_usuario_tb DROP CONSTRAINT IF EXISTS "HOT_CLICK_USUARIO_TB_CORREO_key";
ALTER TABLE hot_click_usuario_tb DROP CONSTRAINT IF EXISTS "hot_click_usuario_tb_CORREO_key";
ALTER TABLE hot_click_usuario_tb DROP CONSTRAINT IF EXISTS hot_click_usuario_tb_correo_key;

-- Eliminar constraints UNIQUE absolutos en identificacion
ALTER TABLE hot_click_usuario_tb DROP CONSTRAINT IF EXISTS "HOT_CLICK_USUARIO_TB_IDENTIFICACION_key";
ALTER TABLE hot_click_usuario_tb DROP CONSTRAINT IF EXISTS "hot_click_usuario_tb_IDENTIFICACION_key";
ALTER TABLE hot_click_usuario_tb DROP CONSTRAINT IF EXISTS hot_click_usuario_tb_identificacion_key;

-- Índice único parcial: solo entre usuarios NO eliminados (fk_id_estado = 3 es ELIMINADO)
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_correo_no_eliminado
    ON hot_click_usuario_tb (correo)
    WHERE fk_id_estado <> 3;

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_identificacion_no_eliminado
    ON hot_click_usuario_tb (identificacion)
    WHERE fk_id_estado <> 3;
