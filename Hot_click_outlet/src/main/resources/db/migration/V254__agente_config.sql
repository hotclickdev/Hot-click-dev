-- V254: AG-19 / AG-22 — configuración del bot de ventas por negocio (nombre, trato, emojis, activo, horario semanal en
-- hora de Costa Rica y mensaje fuera de horario) y marca de consumo de IA del simulador del panel.
-- Una fila por empresa. Sin fila el bot usa los valores por defecto de las propiedades agente.tono.*.
-- horario_json: lista de 7 días [{"dia":"LUNES","abierto":true,"desde":"08:00","hasta":"17:00"}, ...] (TEXT, se valida en la app).
-- Idempotente.

CREATE TABLE IF NOT EXISTS hot_click_agente_config_tb (
    id_config              BIGSERIAL     PRIMARY KEY,
    fk_id_empresa          BIGINT        NOT NULL UNIQUE REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE,
    nombre_bot             VARCHAR(60)   NOT NULL DEFAULT 'el asistente virtual',
    trato                  VARCHAR(8)    NOT NULL DEFAULT 'USTED' CHECK (trato IN ('USTED', 'TUTEO')),
    emojis                 BOOLEAN       NOT NULL DEFAULT FALSE,
    activo                 BOOLEAN       NOT NULL DEFAULT TRUE,
    horario_activo         BOOLEAN       NOT NULL DEFAULT FALSE,
    horario_json           TEXT,
    mensaje_fuera_horario  VARCHAR(500),
    creado_en              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Consumo de IA del simulador del panel (ya contado también en los tokens normales): permite separarlo del tráfico real.
ALTER TABLE hot_click_ai_uso_tb ADD COLUMN IF NOT EXISTS llamadas_simulador INT    NOT NULL DEFAULT 0;
ALTER TABLE hot_click_ai_uso_tb ADD COLUMN IF NOT EXISTS tokens_simulador   BIGINT NOT NULL DEFAULT 0;
