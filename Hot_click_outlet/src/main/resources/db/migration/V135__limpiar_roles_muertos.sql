-- V135: limpiar roles JWT muertos (staff plataforma + POS)
-- No edita V89/V126; inactiva SUPPORT/FINANCE/TRUST y remapea usuarios a ADMIN.
-- POS (CAJERO, GERENTE, …) ya inactivos en V89 — se refuerza descripción.

-- Remapear usuarios staff → ADMIN (si tienen SUPPORT/FINANCE/TRUST)
INSERT INTO hot_click_usuario_rol_tb (fk_id_usuario, fk_id_rol)
SELECT DISTINCT ur.fk_id_usuario,
       (SELECT id_rol FROM hot_click_rol_tb WHERE nombre_rol = 'ADMIN' LIMIT 1)
FROM hot_click_usuario_rol_tb ur
JOIN hot_click_rol_tb r ON r.id_rol = ur.fk_id_rol
WHERE r.nombre_rol IN ('SUPPORT', 'FINANCE', 'TRUST')
  AND NOT EXISTS (
    SELECT 1 FROM hot_click_usuario_rol_tb ur2
    JOIN hot_click_rol_tb r2 ON r2.id_rol = ur2.fk_id_rol
    WHERE ur2.fk_id_usuario = ur.fk_id_usuario AND r2.nombre_rol = 'ADMIN'
  )
ON CONFLICT DO NOTHING;

DELETE FROM hot_click_usuario_rol_tb
WHERE fk_id_rol IN (
  SELECT id_rol FROM hot_click_rol_tb
  WHERE nombre_rol IN ('SUPPORT', 'FINANCE', 'TRUST')
);

DELETE FROM hot_click_rol_permiso_tb
WHERE fk_id_rol IN (
  SELECT id_rol FROM hot_click_rol_tb
  WHERE nombre_rol IN ('SUPPORT', 'FINANCE', 'TRUST')
);

-- UPDATE … SET en la misma línea: E18 no confunde con SET de sesión PgBouncer
UPDATE hot_click_rol_tb SET fk_id_estado = 2,
    descripcion = '[ELIMINADO — no usado; JWT vivos: ADMIN, EMPRENDEDOR, USUARIO_FINAL]'
WHERE nombre_rol IN ('SUPPORT', 'FINANCE', 'TRUST');

UPDATE hot_click_rol_tb SET fk_id_estado = 2,
    descripcion = COALESCE(descripcion, '') || ' [ELIMINADO — POS/legacy]'
WHERE nombre_rol IN ('CAJERO', 'INVENTARIO', 'CONTABILIDAD', 'GERENTE', 'SUPERVISOR', 'MARKETING', 'SOPORTE')
  AND (descripcion IS NULL OR descripcion NOT LIKE '%ELIMINADO%');
