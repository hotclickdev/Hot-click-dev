-- ============================================================
-- HOT_CLICK - Módulo Pagos PayXpert v1.0
-- PostgreSQL 16 / Supabase
-- Ejecutar en el SQL Editor de Supabase después de hotclick_core_v1.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS "hot_click_pago_tb" (
  "id_pago"             BIGSERIAL    PRIMARY KEY,
  "merchant_token"      varchar(500) UNIQUE NOT NULL,
  "redirect_url"        varchar(1000),
  "monto"               integer      NOT NULL,
  "moneda"              varchar(3)   NOT NULL DEFAULT 'CRC',
  "estado_pago"         varchar(30)  NOT NULL DEFAULT 'PENDIENTE',
  "metodo_pago_tipo"    varchar(30),
  "fecha_creacion"      timestamp    DEFAULT CURRENT_TIMESTAMP,
  "fecha_actualizacion" timestamp    DEFAULT CURRENT_TIMESTAMP,
  "fecha_expiracion"    timestamp,
  "fk_id_pedido"        bigint       NOT NULL,
  "fk_id_usuario"       integer      NOT NULL,
  "fk_id_estado"        integer      NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "hot_click_transaccion_pago_tb" (
  "id_transaccion"      BIGSERIAL    PRIMARY KEY,
  "payxpert_txn_id"     varchar(200),
  "error_code"          varchar(10)  NOT NULL,
  "error_message"       varchar(500),
  "card_last4"          varchar(4),
  "card_brand"          varchar(20),
  "tipo_operacion"      varchar(30)  NOT NULL,
  "monto_operacion"     integer      NOT NULL,
  "payload_respuesta"   jsonb,
  "fecha_transaccion"   timestamp    DEFAULT CURRENT_TIMESTAMP,
  "fk_id_pago"          bigint       NOT NULL,
  "fk_id_estado"        integer      NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "hot_click_webhook_event_tb" (
  "id_webhook_event"    BIGSERIAL    PRIMARY KEY,
  "merchant_token"      varchar(500) NOT NULL,
  "evento_tipo"         varchar(50)  NOT NULL,
  "payload_raw"         jsonb        NOT NULL,
  "procesado"           boolean      DEFAULT false,
  "procesado_en"        timestamp,
  "error_procesamiento" text,
  "ip_origen"           varchar(45),
  "fecha_recepcion"     timestamp    DEFAULT CURRENT_TIMESTAMP,
  "fk_id_estado"        integer      NOT NULL DEFAULT 1,
  UNIQUE ("merchant_token", "evento_tipo")
);

CREATE TABLE IF NOT EXISTS "hot_click_payment_log_tb" (
  "id_log"              BIGSERIAL    PRIMARY KEY,
  "accion"              varchar(50)  NOT NULL,
  "url_llamada"         varchar(500) NOT NULL,
  "http_method"         varchar(10)  NOT NULL,
  "request_body"        jsonb,
  "response_code"       integer,
  "response_body"       jsonb,
  "duracion_ms"         integer,
  "exitoso"             boolean      DEFAULT false,
  "fecha_log"           timestamp    DEFAULT CURRENT_TIMESTAMP,
  "fk_id_pago"          bigint,
  "fk_id_usuario"       integer,
  "fk_id_estado"        integer      NOT NULL DEFAULT 1
);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================
ALTER TABLE "hot_click_pago_tb"
  ADD FOREIGN KEY ("fk_id_pedido")  REFERENCES "HOT_CLICK_PEDIDO_TB"  ("ID_PEDIDO"),
  ADD FOREIGN KEY ("fk_id_usuario") REFERENCES "HOT_CLICK_USUARIO_TB" ("ID_USUARIO"),
  ADD FOREIGN KEY ("fk_id_estado")  REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");

ALTER TABLE "hot_click_transaccion_pago_tb"
  ADD FOREIGN KEY ("fk_id_pago")   REFERENCES "hot_click_pago_tb"    ("id_pago"),
  ADD FOREIGN KEY ("fk_id_estado") REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");

ALTER TABLE "hot_click_webhook_event_tb"
  ADD FOREIGN KEY ("fk_id_estado") REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");

ALTER TABLE "hot_click_payment_log_tb"
  ADD FOREIGN KEY ("fk_id_pago")    REFERENCES "hot_click_pago_tb"    ("id_pago"),
  ADD FOREIGN KEY ("fk_id_usuario") REFERENCES "HOT_CLICK_USUARIO_TB" ("ID_USUARIO"),
  ADD FOREIGN KEY ("fk_id_estado")  REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pago_pedido       ON "hot_click_pago_tb" ("fk_id_pedido");
CREATE INDEX IF NOT EXISTS idx_pago_usuario      ON "hot_click_pago_tb" ("fk_id_usuario");
CREATE INDEX IF NOT EXISTS idx_pago_estado       ON "hot_click_pago_tb" ("estado_pago");
CREATE INDEX IF NOT EXISTS idx_pago_merchant     ON "hot_click_pago_tb" ("merchant_token");
CREATE INDEX IF NOT EXISTS idx_txn_pago          ON "hot_click_transaccion_pago_tb" ("fk_id_pago");
CREATE INDEX IF NOT EXISTS idx_txn_fecha         ON "hot_click_transaccion_pago_tb" ("fecha_transaccion");
CREATE INDEX IF NOT EXISTS idx_webhook_token     ON "hot_click_webhook_event_tb" ("merchant_token");
CREATE INDEX IF NOT EXISTS idx_webhook_procesado ON "hot_click_webhook_event_tb" ("procesado");
CREATE INDEX IF NOT EXISTS idx_log_pago          ON "hot_click_payment_log_tb" ("fk_id_pago");
CREATE INDEX IF NOT EXISTS idx_log_fecha         ON "hot_click_payment_log_tb" ("fecha_log");

-- ============================================================
-- METODOS DE PAGO
-- ============================================================
INSERT INTO "HOT_CLICK_METODO_PAGO_CONFIG_TB" ("ID_METODO_PAGO_CONFIG", "NOMBRE", "ACTIVO", "ORDEN") VALUES
  (4, 'PAYXPERT_TARJETA',   TRUE,  4),
  (5, 'PAYXPERT_APPLE_PAY', FALSE, 5)
ON CONFLICT ("ID_METODO_PAGO_CONFIG") DO NOTHING;
