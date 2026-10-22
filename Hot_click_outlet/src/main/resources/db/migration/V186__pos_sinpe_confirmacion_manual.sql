-- V186: confirmaciones manuales de SINPE en caja (POS QR). Aditiva.
-- Referencia única por empresa (no se reutiliza un comprobante), una confirmación por sesión,
-- quién generó y quién confirmó, y registro inmutable (trigger rechaza UPDATE y DELETE).
CREATE TABLE IF NOT EXISTS hot_click_pos_sinpe_confirmacion_tb (
    id_confirmacion         BIGSERIAL PRIMARY KEY,
    fk_id_empresa           BIGINT       NOT NULL,
    fk_id_qr_sesion         BIGINT       NOT NULL,
    fk_id_pedido            BIGINT,
    referencia              VARCHAR(30)  NOT NULL,
    total                   INTEGER      NOT NULL,
    fk_id_usuario_genero    BIGINT,
    fk_id_usuario_confirmo  BIGINT       NOT NULL,
    fecha_confirmacion      TIMESTAMP    NOT NULL,
    CONSTRAINT uq_pos_sinpe_conf_empresa_ref UNIQUE (fk_id_empresa, referencia),
    CONSTRAINT uq_pos_sinpe_conf_sesion UNIQUE (fk_id_qr_sesion),
    CONSTRAINT ck_pos_sinpe_conf_ref CHECK (referencia ~ '^[A-Z0-9]{6,30}$'),
    CONSTRAINT ck_pos_sinpe_conf_cuatro_ojos CHECK (fk_id_usuario_genero IS NULL OR fk_id_usuario_genero <> fk_id_usuario_confirmo)
);
CREATE INDEX IF NOT EXISTS ix_pos_sinpe_conf_empresa_fecha
    ON hot_click_pos_sinpe_confirmacion_tb (fk_id_empresa, fecha_confirmacion DESC);

CREATE OR REPLACE FUNCTION hc_pos_sinpe_conf_inmutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'hot_click_pos_sinpe_confirmacion_tb es inmutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pos_sinpe_conf_inmutable ON hot_click_pos_sinpe_confirmacion_tb;
CREATE TRIGGER trg_pos_sinpe_conf_inmutable
    BEFORE UPDATE OR DELETE ON hot_click_pos_sinpe_confirmacion_tb
    FOR EACH ROW EXECUTE FUNCTION hc_pos_sinpe_conf_inmutable();

-- Permiso para la lista de revisión (solo ADMIN y EMPRENDEDOR).
INSERT INTO hot_click_permiso_tb (nombre_permiso, descripcion, modulo)
SELECT 'pos.sinpe.revisar', 'Revisar confirmaciones manuales de SINPE en caja', 'POS'
WHERE NOT EXISTS (SELECT 1 FROM hot_click_permiso_tb WHERE nombre_permiso = 'pos.sinpe.revisar');

-- pos.sinpe.revisar: solo ADMIN y EMPRENDEDOR (dueño), cada uno acotado a su empresa en el controlador.
INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso)
SELECT r.id_rol, p.id_permiso
FROM hot_click_rol_tb r
CROSS JOIN hot_click_permiso_tb p
WHERE r.nombre_rol IN ('ADMIN', 'EMPRENDEDOR')
  AND p.nombre_permiso = 'pos.sinpe.revisar'
  AND NOT EXISTS (SELECT 1 FROM hot_click_rol_permiso_tb rp
                  WHERE rp.fk_id_rol = r.id_rol AND rp.fk_id_permiso = p.id_permiso);
