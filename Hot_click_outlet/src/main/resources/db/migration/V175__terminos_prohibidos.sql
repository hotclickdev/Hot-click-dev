-- QA-NEG-038: términos que no se pueden publicar. Lista inicial aprobada (16-oct-2026); la edita el ADMIN
-- en /api/admin/terminos-prohibidos. Términos normalizados (minúsculas, sin tildes).
CREATE TABLE IF NOT EXISTS hot_click_termino_prohibido_tb (
    id_termino     BIGSERIAL PRIMARY KEY,
    termino        VARCHAR(80) NOT NULL UNIQUE,
    fecha_creacion TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO hot_click_termino_prohibido_tb (termino) VALUES
    ('vape'), ('tabaco'), ('armas'), ('drogas')
ON CONFLICT (termino) DO NOTHING;
