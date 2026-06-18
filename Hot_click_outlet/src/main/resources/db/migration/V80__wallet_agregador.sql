-- V50: Módulo Agregador — Billetera Virtual + Comisiones + Payouts
-- Modelo: la plataforma recibe el dinero primero y acredita el neto al emprendedor.
-- Compatible con PgBouncer transaction mode (sin advisory locks ni session vars).

-- ============================================================
-- Billetera por empresa (saldo neto acumulado en ₡ enteros)
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_wallet_tb (
    fk_id_empresa       BIGINT  NOT NULL PRIMARY KEY
        REFERENCES hot_click_empresa_tb(id_empresa),
    saldo_disponible    BIGINT  NOT NULL DEFAULT 0,  -- listo para retirar
    saldo_retenido      BIGINT  NOT NULL DEFAULT 0,  -- en proceso de payout
    total_acreditado    BIGINT  NOT NULL DEFAULT 0,  -- histórico de ventas netas
    total_retirado      BIGINT  NOT NULL DEFAULT 0,  -- histórico de payouts pagados
    ultima_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Ledger inmutable — cada movimiento queda registrado para siempre
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_wallet_transaccion_tb (
    id_transaccion      BIGSERIAL   PRIMARY KEY,
    fk_id_empresa       BIGINT      NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    tipo                VARCHAR(25) NOT NULL,
    -- CREDITO_VENTA | DEBITO_PAYOUT | RETENCION_PAYOUT | LIBERACION_PAYOUT | DEVOLUCION | AJUSTE_MANUAL
    monto               BIGINT      NOT NULL,   -- positivo = crédito, negativo = débito
    saldo_tras_movimiento BIGINT    NOT NULL DEFAULT 0,
    -- Desglose de la venta (solo para CREDITO_VENTA)
    total_bruto         BIGINT,     -- lo que pagó el cliente (precio incluye IVA)
    comision_saas       BIGINT,     -- 2% del bruto retenido por la plataforma
    comision_gw         BIGINT,     -- 3% estimado de la pasarela (Stripe / SINPE)
    -- Referencia al origen
    referencia_tipo     VARCHAR(20),  -- PEDIDO | PAYOUT | MANUAL
    referencia_id       BIGINT,
    descripcion         TEXT,
    fecha_creacion      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_empresa ON hot_click_wallet_transaccion_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_tipo    ON hot_click_wallet_transaccion_tb (tipo);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_fecha   ON hot_click_wallet_transaccion_tb (fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_ref     ON hot_click_wallet_transaccion_tb (referencia_tipo, referencia_id);

-- ============================================================
-- Solicitudes de retiro (Payout)
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_payout_request_tb (
    id_payout           BIGSERIAL   PRIMARY KEY,
    fk_id_empresa       BIGINT      NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    monto               BIGINT      NOT NULL CHECK (monto > 0),
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    -- PENDIENTE → EN_PROCESO → PAGADO | RECHAZADO
    metodo              VARCHAR(20) NOT NULL DEFAULT 'SINPE',  -- SINPE | TRANSFERENCIA | OTRO
    destino_sinpe       VARCHAR(20),     -- número SINPE móvil (8 dígitos CR)
    destino_iban        VARCHAR(30),     -- IBAN para transferencia bancaria
    nombre_titular      VARCHAR(200),
    banco_destino       VARCHAR(100),
    notas_solicitante   TEXT,
    notas_admin         TEXT,
    fk_id_wallet_tx_retencion  BIGINT REFERENCES hot_click_wallet_transaccion_tb(id_transaccion),
    fk_id_wallet_tx_pago       BIGINT REFERENCES hot_click_wallet_transaccion_tb(id_transaccion),
    fecha_solicitud     TIMESTAMP   NOT NULL DEFAULT NOW(),
    fecha_pago          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payout_empresa ON hot_click_payout_request_tb (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_payout_estado  ON hot_click_payout_request_tb (estado);

-- ============================================================
-- Inicializar wallet para empresa 1 (HOTCLICK seed)
-- ============================================================
INSERT INTO hot_click_wallet_tb (fk_id_empresa, saldo_disponible, saldo_retenido)
VALUES (1, 0, 0)
ON CONFLICT DO NOTHING;
