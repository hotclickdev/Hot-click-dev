-- Por qué una cuenta quedó ELIMINADA (estado 3): SALIDA_EQUIPO, ADMIN, BORRADO_DATOS.
-- Sin backfill: las filas ya eliminadas quedan en NULL y NULL es fail-closed (una invitación no las reactiva).
ALTER TABLE hot_click_usuario_tb ADD COLUMN IF NOT EXISTS motivo_eliminacion VARCHAR(40);
