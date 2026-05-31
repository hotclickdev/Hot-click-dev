-- V16: tabla de membresías usuario-empresa (multi-negocio por persona)
-- Un usuario puede pertenecer a hasta 20 negocios simultáneamente

CREATE TABLE IF NOT EXISTS hot_click_miembro_empresa_tb (
    id_miembro      BIGSERIAL PRIMARY KEY,
    fk_id_usuario   BIGINT    NOT NULL REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE CASCADE,
    fk_id_empresa   BIGINT    NOT NULL REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    rol_en_empresa  VARCHAR(30) NOT NULL DEFAULT 'MIEMBRO',  -- PROPIETARIO, ADMIN, MIEMBRO
    estado          INTEGER   NOT NULL DEFAULT 1,            -- 1=activo, 0=inactivo
    fecha_ingreso   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_miembro_empresa UNIQUE (fk_id_usuario, fk_id_empresa)
);

CREATE INDEX IF NOT EXISTS idx_miembro_usuario ON hot_click_miembro_empresa_tb(fk_id_usuario);
CREATE INDEX IF NOT EXISTS idx_miembro_empresa ON hot_click_miembro_empresa_tb(fk_id_empresa);

-- Migrar datos existentes: cada usuario con fk_id_empresa tiene membresía PROPIETARIO
INSERT INTO hot_click_miembro_empresa_tb (fk_id_usuario, fk_id_empresa, rol_en_empresa, estado, fecha_ingreso)
SELECT
    u.id_usuario,
    u.fk_id_empresa,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM hot_click_usuario_rol_tb ur
            JOIN hot_click_rol_tb r ON ur.fk_id_rol = r.id_rol
            WHERE ur.fk_id_usuario = u.id_usuario
            AND r.nombre_rol = 'EMPRENDEDOR'
        ) THEN 'PROPIETARIO'
        ELSE 'ADMIN'
    END,
    COALESCE(u.fk_id_estado, 1),
    COALESCE(u.fecha_registro, NOW())
FROM hot_click_usuario_tb u
WHERE u.fk_id_empresa IS NOT NULL
ON CONFLICT (fk_id_usuario, fk_id_empresa) DO NOTHING;
