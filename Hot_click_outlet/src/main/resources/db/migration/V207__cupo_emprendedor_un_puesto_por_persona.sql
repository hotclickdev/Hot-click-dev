-- Cupo Emprendedor anti-abuso (27-oct-2026). Aditiva: dos columnas NULL, dos índices únicos y un trigger. No toca filas existentes.
-- El puesto del trial se asigna al APROBAR el negocio (no al registrarlo) y es de UNA persona: el titular del puesto
-- (usuario propietario y correo verificado, normalizado) queda en la propia fila de la empresa con UNIQUE, así que la BD
-- rechaza un segundo puesto para la misma persona aunque el código falle. Los NULL no chocan entre sí en PostgreSQL.
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS trial_emprendedor_titular_usuario BIGINT;
ALTER TABLE hot_click_empresa_tb ADD COLUMN IF NOT EXISTS trial_emprendedor_titular_correo VARCHAR(160);
CREATE UNIQUE INDEX IF NOT EXISTS uq_empresa_trial_emprendedor_titular_usuario
    ON hot_click_empresa_tb (trial_emprendedor_titular_usuario);
CREATE UNIQUE INDEX IF NOT EXISTS uq_empresa_trial_emprendedor_titular_correo
    ON hot_click_empresa_tb (trial_emprendedor_titular_correo);

-- Si se borra un negocio que aún estaba en trial, su puesto vuelve al cupo (atómico, nunca bajo 0).
-- El rechazo desde la app libera por su lado con un UPDATE condicionado (sin doble liberación).
CREATE OR REPLACE FUNCTION fn_cupo_emprendedor_liberar_al_borrar() RETURNS trigger AS $fn$
BEGIN
    IF OLD.trial_emprendedor_pos IS NOT NULL AND OLD.estado_plan = 'TRIAL' THEN
        UPDATE hot_click_cupo_emprendedor_tb SET usados = usados - 1 WHERE id = 1 AND usados > 0;
    END IF;
    RETURN OLD;
END;
$fn$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_cupo_emprendedor_liberar_al_borrar
    AFTER DELETE ON hot_click_empresa_tb
    FOR EACH ROW EXECUTE FUNCTION fn_cupo_emprendedor_liberar_al_borrar();
