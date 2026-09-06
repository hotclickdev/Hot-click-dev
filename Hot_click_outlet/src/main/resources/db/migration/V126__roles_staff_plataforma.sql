-- V126: Roles de staff de plataforma (SUPPORT / FINANCE / TRUST)
-- Usan permisos global.* de V8. NO reciben el bypass de CompanyScope (solo ADMIN).
-- Distintos del rol tenant SOPORTE (V24, atención al cliente de un negocio).
-- No pisa V119 (ADMIN sin empresa) ni V121 (gift cards).

INSERT INTO hot_click_rol_tb (nombre_rol, descripcion, nivel_acceso, fk_id_estado)
SELECT 'SUPPORT', 'Staff plataforma — tickets y ver tiendas', 80, 1
WHERE NOT EXISTS (SELECT 1 FROM hot_click_rol_tb WHERE nombre_rol = 'SUPPORT');

INSERT INTO hot_click_rol_tb (nombre_rol, descripcion, nivel_acceso, fk_id_estado)
SELECT 'FINANCE', 'Staff plataforma — payouts, billing y pagos', 80, 1
WHERE NOT EXISTS (SELECT 1 FROM hot_click_rol_tb WHERE nombre_rol = 'FINANCE');

INSERT INTO hot_click_rol_tb (nombre_rol, descripcion, nivel_acceso, fk_id_estado)
SELECT 'TRUST', 'Staff plataforma — moderación y suspensiones', 80, 1
WHERE NOT EXISTS (SELECT 1 FROM hot_click_rol_tb WHERE nombre_rol = 'TRUST');

-- Matriz permiso → rol (ADMIN ya tiene todos vía V8)
INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT r.id_rol, p.id_permiso
FROM hot_click_rol_tb r
CROSS JOIN hot_click_permiso_tb p
WHERE r.nombre_rol = 'SUPPORT'
  AND p.nombre_permiso = 'global.companies'
ON CONFLICT DO NOTHING;

INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT r.id_rol, p.id_permiso
FROM hot_click_rol_tb r
CROSS JOIN hot_click_permiso_tb p
WHERE r.nombre_rol = 'FINANCE'
  AND p.nombre_permiso = 'global.metrics'
ON CONFLICT DO NOTHING;

INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT r.id_rol, p.id_permiso
FROM hot_click_rol_tb r
CROSS JOIN hot_click_permiso_tb p
WHERE r.nombre_rol = 'TRUST'
  AND p.nombre_permiso = 'global.approvals'
ON CONFLICT DO NOTHING;

-- Staff de plataforma sin empresa propia (igual que ADMIN en V119). No toca ADMIN.
UPDATE hot_click_usuario_tb u
SET fk_id_empresa = NULL
WHERE EXISTS (
    SELECT 1
    FROM hot_click_usuario_rol_tb ur
    JOIN hot_click_rol_tb r ON r.id_rol = ur.fk_id_rol
    WHERE ur.fk_id_usuario = u.id_usuario
      AND r.nombre_rol IN ('SUPPORT', 'FINANCE', 'TRUST')
);
