-- B9 (residual MED-5): un solo usuario activo por correo sin distinguir mayúsculas.
-- Aditiva: solo crea un índice; no reescribe ni borra filas. Mismo alcance que uq_usuario_correo_no_eliminado (V15):
-- los usuarios eliminados (fk_id_estado = 3) pueden repetir correo.
-- PRE-DEPLOY: si en la BD hay dos usuarios no eliminados cuyo correo difiere solo en mayúsculas, esta migración
-- falla y la app no arranca. Antes de desplegar, correr y resolver a mano:
--   SELECT lower(correo), count(*), array_agg(id_usuario) FROM hot_click_usuario_tb
--   WHERE fk_id_estado <> 3 GROUP BY 1 HAVING count(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_lower_correo_no_eliminado
    ON hot_click_usuario_tb (lower(correo))
    WHERE fk_id_estado <> 3;
