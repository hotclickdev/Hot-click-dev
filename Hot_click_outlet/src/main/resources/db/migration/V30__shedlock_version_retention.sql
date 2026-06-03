-- V30: F0 Infrastructure Hardening
-- 1. ShedLock — distributed lock para @Scheduled en multi-pod
-- 2. Optimistic locking en stock de productos (previene race conditions)
-- 3. Índice de performance para retención de datos

-- ============================================================
-- ShedLock
-- ============================================================
CREATE TABLE IF NOT EXISTS shedlock (
    name       VARCHAR(64)  NOT NULL,
    lock_until TIMESTAMP    NOT NULL,
    locked_at  TIMESTAMP    NOT NULL,
    locked_by  VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);

-- ============================================================
-- Optimistic locking en Producto (previene race condition de stock
-- cuando dos cajeros venden el mismo producto simultáneamente)
-- ============================================================
ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;

UPDATE hot_click_producto_tb SET version = 0 WHERE version IS NULL;
