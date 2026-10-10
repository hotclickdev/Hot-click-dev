-- V166: un solo movimiento de billetera por (referencia_tipo, referencia_id, tipo).
--
-- Recomendación de la auditoría del merge 89c1795b2. V81 ya protege CREDITO_VENTA por pedido
-- (uq_wallet_tx_credito_por_pedido); este índice extiende la garantía a los movimientos de payout
-- (RETENCION_PAYOUT, LIBERACION_PAYOUT, DEBITO_PAYOUT por solicitud) y a cualquier tipo futuro.
--
-- Parcial (referencia_id IS NOT NULL): WalletPayoutRequestService guarda la retención sin
-- referencia_id y la completa después de crear la solicitud; los ajustes sin referencia no aplican.
--
-- Sin CONCURRENTLY, a propósito: Flyway (11.x, lock transaccional por defecto en PostgreSQL) deja su
-- conexión de lock "idle in transaction" y CREATE INDEX CONCURRENTLY la espera para siempre
-- (probado en PG17: el deploy queda colgado y, al cortarlo, queda un índice INVALID). La tabla es
-- chica: el índice normal bloquea escrituras de la billetera unos milisegundos, corre dentro de la
-- transacción de Flyway y, si hay duplicados, falla y hace rollback sin dejar nada a medias.
--
-- ANTES DE APLICAR: correr la consulta de duplicados del PR (debe devolver 0 filas).
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_referencia_tipo
    ON hot_click_wallet_transaccion_tb (referencia_tipo, referencia_id, tipo)
    WHERE referencia_id IS NOT NULL;
