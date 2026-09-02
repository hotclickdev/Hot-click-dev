-- Cupo histórico de 70 altas gratis al plan Emprendedor.
CREATE TABLE IF NOT EXISTS hot_click_cupo_emprendedor_tb (
    id     SMALLINT PRIMARY KEY,
    limite INTEGER NOT NULL DEFAULT 70,
    usados INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT cupo_emprendedor_unica CHECK (id = 1),
    CONSTRAINT cupo_emprendedor_rango CHECK (usados >= 0 AND limite > 0)
);

INSERT INTO hot_click_cupo_emprendedor_tb (id, limite, usados)
VALUES (1, 70, 0)
ON CONFLICT (id) DO NOTHING;

UPDATE hot_click_cupo_emprendedor_tb
SET usados = (
    SELECT COUNT(*)
    FROM hot_click_empresa_tb
    WHERE correo_empresa NOT ILIKE '%@hotclick.test'
)
WHERE id = 1 AND usados = 0;
