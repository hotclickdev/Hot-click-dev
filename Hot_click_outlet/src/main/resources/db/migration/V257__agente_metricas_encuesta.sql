-- V257: AG-32/AG-35/AG-38 - metricas del bot, resena despues de la entrega y encuesta de satisfaccion.
-- Idempotente y aditiva. Sin datos de contacto: la nota es solo un numero ligado a la conversacion.

-- AG-38: encuesta al cerrar la conversacion (solo WhatsApp). encuesta_enviada_en es la guarda de "una sola vez".
ALTER TABLE hot_click_chat_sesion_tb ADD COLUMN IF NOT EXISTS encuesta_enviada_en TIMESTAMPTZ;
ALTER TABLE hot_click_chat_sesion_tb ADD COLUMN IF NOT EXISTS encuesta_respondida_en TIMESTAMPTZ;
ALTER TABLE hot_click_chat_sesion_tb ADD COLUMN IF NOT EXISTS encuesta_nota SMALLINT CHECK (encuesta_nota BETWEEN 1 AND 5);
CREATE INDEX IF NOT EXISTS idx_chat_sesion_nota_baja
    ON hot_click_chat_sesion_tb (fk_id_empresa, ultimo_mensaje_en DESC) WHERE encuesta_nota IS NOT NULL AND encuesta_nota <= 2;

-- AG-35: una resena pedida por pedido. La PK es la guarda de idempotencia (INSERT ... ON CONFLICT DO NOTHING).
CREATE TABLE IF NOT EXISTS hot_click_agente_resena_aviso_tb (
    fk_id_pedido   BIGINT       PRIMARY KEY REFERENCES hot_click_pedido_tb (id_pedido) ON DELETE CASCADE,
    fk_id_empresa  BIGINT       REFERENCES hot_click_empresa_tb (id_empresa) ON DELETE CASCADE,
    enviado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agente_resena_aviso_enviado ON hot_click_agente_resena_aviso_tb (enviado_en);

-- AG-32: avisos de Meta sobre la cuenta o la calidad del numero (account_update, phone_number_quality_update...).
-- Solo campo, evento y limite que Meta informa; nunca telefonos ni texto de clientes.
CREATE TABLE IF NOT EXISTS hot_click_agente_alerta_meta_tb (
    id_alerta       BIGSERIAL    PRIMARY KEY,
    campo           VARCHAR(40)  NOT NULL,
    evento          VARCHAR(40),
    limite          VARCHAR(40),
    cuenta_externa  VARCHAR(40),
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agente_alerta_meta_creado ON hot_click_agente_alerta_meta_tb (creado_en DESC);

-- Indices para las consultas agregadas de metricas (rango de fechas por negocio).
CREATE INDEX IF NOT EXISTS idx_enlace_compra_empresa_creado ON hot_click_enlace_compra_tb (fk_id_empresa, creado);
CREATE INDEX IF NOT EXISTS idx_pedido_origen_canal_fecha ON hot_click_pedido_tb (fecha_pedido) WHERE origen_canal IS NOT NULL;
