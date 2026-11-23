-- V245 (23-nov-2026): a donde fue el dinero de cada pago en linea (SUBCUENTA del negocio vs PLATAFORMA) y el
-- saldo por reintegrar de los pagos que cayeron a la cuenta principal de HotClick. Aditiva e idempotente.
--  * destino_dinero: SUBCUENTA | PLATAFORMA | NULL (pago anterior a V245 o proveedor sin ONVO: sin registro).
--  * reintegro_estado: NULL (no aplica / historico sin rastreo) | NO_REINTEGRADO | REINTEGRADO.
-- Los pagos historicos NO se marcan por defecto: ver docs/alta-negocio-fases/MIGRACION_NEGOCIOS_EXISTENTES.md.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS destino_dinero VARCHAR(12);
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS destino_cuenta_onvo VARCHAR(100);
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reintegro_estado VARCHAR(20);
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reintegrado_por VARCHAR(120);
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reintegrado_en TIMESTAMP;
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS reintegro_nota VARCHAR(300);
CREATE INDEX IF NOT EXISTS ix_pago_reintegro_estado ON hot_click_pago_tb (reintegro_estado) WHERE reintegro_estado IS NOT NULL;
