-- Cupo diario del asistente de IA (chat público, asistente de compras y búsqueda por imagen).
-- Una fila por (clave, día calendario America/Costa_Rica). Claves: c:<cliente>, n:<negocio|marketplace>, g.
-- El día lo calcula la aplicación, así el reinicio ocurre a la medianoche de Costa Rica y no a las 24 h del primer uso.
CREATE TABLE IF NOT EXISTS hot_click_asistente_cuota_dia_tb (
    clave VARCHAR(120) NOT NULL,
    dia   DATE         NOT NULL,
    usos  INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT pk_hot_click_asistente_cuota_dia PRIMARY KEY (clave, dia)
);
