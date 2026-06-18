-- V81: Hardening transaccional del módulo Agregador
-- Cierra tres clases de vulnerabilidades identificadas en auditoría:
--   1. TOCTOU en acreditarVenta   → unique partial index en ledger
--   2. Saldos negativos           → CHECK constraints en wallet
--   3. Race condition en payouts  → unique partial index + DLQ table

-- ============================================================
-- FIX-1: Constraint único en ledger para CREDITO_VENTA por pedido
-- Garantiza que aunque dos webhooks simultáneos pasen el SELECT check,
-- solo un INSERT de CREDITO_VENTA para el mismo pedido pueda persistir.
-- Es el guard real de idempotencia, no la comprobación SELECT previa.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_credito_por_pedido
    ON hot_click_wallet_transaccion_tb (referencia_id)
    WHERE referencia_tipo = 'PEDIDO' AND tipo = 'CREDITO_VENTA';

-- ============================================================
-- FIX-2a: CHECK constraints — ningún saldo puede volverse negativo
-- Si la lógica de aplicación falla, la BD actúa como última línea de defensa.
-- ============================================================
ALTER TABLE hot_click_wallet_tb
    ADD CONSTRAINT chk_wallet_saldo_disponible_positivo
        CHECK (saldo_disponible >= 0),
    ADD CONSTRAINT chk_wallet_saldo_retenido_positivo
        CHECK (saldo_retenido >= 0),
    ADD CONSTRAINT chk_wallet_totales_positivos
        CHECK (total_acreditado >= 0 AND total_retirado >= 0);

-- ============================================================
-- FIX-2b: La cantidad retenida nunca puede superar el total acreditado
-- ============================================================
ALTER TABLE hot_click_wallet_tb
    ADD CONSTRAINT chk_wallet_retenido_le_acreditado
        CHECK (saldo_retenido <= total_acreditado);

-- ============================================================
-- FIX-3: Solo puede existir UN payout PENDIENTE o EN_PROCESO por empresa.
-- Si dos solicitudes simultáneas pasan el SELECT check, solo una INSERT
-- puede persistir; la segunda recibirá un error de constraint.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_activo_por_empresa
    ON hot_click_payout_request_tb (fk_id_empresa)
    WHERE estado IN ('PENDIENTE', 'EN_PROCESO');

-- ============================================================
-- DLQ (Dead-Letter Queue) para acreditaciones fallidas
-- Si @Async falla por BD caída o error de red, el dinero queda
-- aquí para ser reintentado por WalletReconciliacionScheduler
-- con backoff exponencial hasta MAX_INTENTOS.
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_click_wallet_dlq_tb (
    id_dlq              BIGSERIAL   PRIMARY KEY,
    fk_id_empresa       BIGINT      NOT NULL REFERENCES hot_click_empresa_tb(id_empresa),
    fk_id_pedido        BIGINT      NOT NULL UNIQUE,   -- idempotencia: un pedido → una entrada DLQ
    total_bruto         BIGINT      NOT NULL,
    com_saas            BIGINT      NOT NULL,
    com_gw              BIGINT      NOT NULL,
    monto_neto          BIGINT      NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE_REINTENTO',
    -- PENDIENTE_REINTENTO → PROCESADO | AGOTADO
    intentos            INTEGER     NOT NULL DEFAULT 0,
    max_intentos        INTEGER     NOT NULL DEFAULT 10,
    ultimo_error        TEXT,
    fecha_creacion      TIMESTAMP   NOT NULL DEFAULT NOW(),
    fecha_proximo_intento TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_completado    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_dlq_estado
    ON hot_click_wallet_dlq_tb (estado, fecha_proximo_intento)
    WHERE estado = 'PENDIENTE_REINTENTO';
