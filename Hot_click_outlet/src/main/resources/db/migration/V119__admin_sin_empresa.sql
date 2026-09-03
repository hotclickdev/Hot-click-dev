-- V119: ADMIN de plataforma sin empresa propia
-- El staff de HotClick modera negocios ajenos; no opera la tienda HOTCLICK (empresa 1).

UPDATE hot_click_usuario_tb u
SET fk_id_empresa = NULL
WHERE EXISTS (
    SELECT 1
    FROM hot_click_usuario_rol_tb ur
    JOIN hot_click_rol_tb r ON r.id_rol = ur.fk_id_rol
    WHERE ur.fk_id_usuario = u.id_usuario
      AND r.nombre_rol = 'ADMIN'
);

DELETE FROM hot_click_miembro_empresa_tb m
WHERE m.fk_id_empresa = 1
  AND EXISTS (
    SELECT 1
    FROM hot_click_usuario_rol_tb ur
    JOIN hot_click_rol_tb r ON r.id_rol = ur.fk_id_rol
    WHERE ur.fk_id_usuario = m.fk_id_usuario
      AND r.nombre_rol = 'ADMIN'
  );
