-- V34: F14 Billing Engine — Suscripciones Stripe + Facturas SaaS + Idempotency

-- ============================================================
-- Suscripción por empresa (una activa a la vez)
-- Estados: TRIAL | ACTIVO | CANCELADO | VENCIDO | PAST_DUE
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_suscripcion_tb (
    id_suscripcion          BIGSERIAL    PRIMARY KEY,
    fk_id_empresa           BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_plan              BIGINT       NOT NULL REFERENCES hot_click_plan_tb(id_plan),
    stripe_customer_id      VARCHAR(100),
    stripe_subscription_id  VARCHAR(100) UNIQUE,
    stripe_price_id         VARCHAR(100),
    estado                  VARCHAR(20)  NOT NULL DEFAULT 'TRIAL',
    fecha_inicio            DATE         NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin               DATE,
    trial_end               DATE,
    cancelar_al_vencer      BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_cancelacion       DATE,
    motivo_cancelacion      TEXT,
    fecha_creacion          TIMESTAMP    NOT NULL DEFAULT NOW(),
    fecha_actualizacion     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suscripcion_empresa  ON hot_click_suscripcion_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_suscripcion_stripe    ON hot_click_suscripcion_tb (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_suscripcion_estado    ON hot_click_suscripcion_tb (estado);

-- ============================================================
-- Facturas SaaS — registra cada cargo mensual de Stripe
-- Estados: PENDIENTE | PAGADO | FALLIDO | VOID
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_factura_saas_tb (
    id_factura_saas         BIGSERIAL    PRIMARY KEY,
    fk_id_empresa           BIGINT       NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_suscripcion       BIGINT       REFERENCES hot_click_suscripcion_tb(id_suscripcion),
    stripe_invoice_id       VARCHAR(100) UNIQUE,
    stripe_payment_intent   VARCHAR(100),
    monto_centavos          INTEGER      NOT NULL,  -- centavos USD (Stripe usa cents)
    moneda                  VARCHAR(3)   NOT NULL DEFAULT 'usd',
    estado                  VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    periodo_inicio          DATE,
    periodo_fin             DATE,
    url_pdf                 VARCHAR(500),
    fecha_creacion          TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factura_saas_empresa ON hot_click_factura_saas_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_factura_saas_estado  ON hot_click_factura_saas_tb (estado);

-- ============================================================
-- Idempotency table para webhooks Stripe (F14.5 incluido)
-- Evita procesar el mismo evento dos veces (redelivery/retry)
-- PK en stripe_event_id garantiza unicidad sin advisory locks
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_stripe_evento_tb (
    stripe_event_id   VARCHAR(100) PRIMARY KEY,
    tipo              VARCHAR(100),
    procesado_ok      BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_recibido    TIMESTAMP    NOT NULL DEFAULT NOW(),
    fecha_procesado   TIMESTAMP,
    error             TEXT
);

-- ============================================================
-- Añadir stripe_customer_id a empresa para reusar entre subs
-- ============================================================
ALTER TABLE hot_click_empresa_tb
    ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_empresa_stripe_customer
    ON hot_click_empresa_tb (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;
