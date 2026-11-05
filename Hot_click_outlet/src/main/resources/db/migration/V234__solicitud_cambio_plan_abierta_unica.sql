-- V234 (04-nov-2026) BAJO Seguridad: una sola solicitud abierta de cambio de plan por pyme, garantizada por la base
-- (antes era check-then-insert y dos POST simultáneos podían crear dos). Aditiva: solo un índice único parcial.
-- Los tests usan H2 con el esquema de Hibernate y Flyway apagado; ahí la carrera se cubre con un test de doble insert.
CREATE UNIQUE INDEX IF NOT EXISTS ux_solicitud_cambio_plan_abierta
    ON hot_click_solicitud_cambio_plan_tb (empresa_id) WHERE revisada = false;
